"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BotContext = createContext<any>(undefined);

export const useBotContext = () => {
    const context = useContext(BotContext);
    if (!context) throw new Error('useBotContext must be used within a BotProvider');
    return context;
};

export const BotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const stateAndSetters = useBotState();
    useBotPersistence(stateAndSetters);

    const totalProfitRef = useRef(0.00);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const currentAssetRef = useRef<string>('');
    const lastDigitsRef = useRef<number[]>([]);
    const lastProcessedRoundRef = useRef<number>(0);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake,
        lastDigits,
        isBotRunning,
        accountType, realToken, demoToken,
        isRouletteMode, setRouletteTimer,
        setIsRouletteSpinning,
        setRouletteHistory,
        rouletteHistory,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        setLastSelectedRouletteNumbers,
        lastRouletteResult, setLastRouletteResult,
        duration,
        addSignal, updateSignalResult,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Conectando...', color: 'bg-yellow-500' });

    useEffect(() => {
        lastDigitsRef.current = lastDigits;
    }, [lastDigits]);

    // 1. SINCRONIZAÇÃO DE HISTÓRICO
    const loadHistoryAndSubscribe = useCallback(async () => {
        const { data, error } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (!error && data) {
            setRouletteHistory(data.map(item => item.number));
        }

        const channel = supabase
            .channel('global_roulette_results')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'roulette_results' },
                (payload) => {
                    const newNum = payload.new.number;
                    setRouletteHistory((prev: number[]) => {
                        if (prev[0] === newNum) return prev;
                        return [newNum, ...prev].slice(0, 100);
                    });
                }
            )
            .subscribe();

        return channel;
    }, [setRouletteHistory]);

    useEffect(() => {
        let channel: any;
        loadHistoryAndSubscribe().then(c => channel = c);
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [loadHistoryAndSubscribe]);

    // 2. EXECUÇÃO DE APOSTAS
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number) => {
        if (!isConnected) return;
        const amount = stake || parseFloat(initialStake) || 0.35;
        
        const signalId = addSignal({
            strategy: "Roleta",
            signal: "ODD",
            details: `Aposta Número ${prediction}`,
            stake: amount
        });

        sendMessageRef.current({
            buy: 1,
            price: amount,
            subscribe: 1,
            parameters: {
                amount: amount,
                basis: 'stake',
                contract_type: contractType,
                currency: 'USD',
                duration: duration,
                duration_unit: 't',
                symbol: asset,
                barrier: prediction !== undefined ? String(prediction) : undefined
            },
            passthrough: { signalId }
        });
    }, [isConnected, initialStake, asset, duration, addSignal]);

    // 3. PROCESSAMENTO DO RESULTADO (MUITO MAIS ROBUSTO)
    const processRouletteResult = useCallback(async (roundId: number) => {
        if (lastProcessedRoundRef.current >= roundId) return;
        lastProcessedRoundRef.current = roundId;

        // Captura o número exato da Deriv
        const resultDigit = lastDigitsRef.current[0];
        if (resultDigit === undefined) return;

        // 1. Atualiza histórico local e o estado de exibição fixa
        setLastRouletteResult(resultDigit);
        setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 100));
        
        // 2. Registra no banco de dados global
        supabase.from('roulette_results').insert({ 
            number: resultDigit, 
            source: 'Sistema Rico 2.0' 
        }).then();

        // 3. Verifica ganhos do usuário
        if (selectedRouletteNumbers.length > 0) {
            const stakePerNumber = parseFloat(initialStake);
            const isWinner = selectedRouletteNumbers.includes(resultDigit);
            
            if (isWinner) {
                const profit = stakePerNumber * 8;
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                addLog(`GANHOU! Número ${resultDigit}`, "WIN", { profit, strategyName: "Roleta" });
                toast.success(`VITÓRIA! O número foi ${resultDigit}`, { duration: 5000 });
            } else {
                const totalLost = stakePerNumber * selectedRouletteNumbers.length;
                totalProfitRef.current -= totalLost;
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                addLog(`DERROTA. Número ${resultDigit}`, "LOSS", { profit: -totalLost, strategyName: "Roleta" });
            }

            // Sincroniza saldo se estiver conectado
            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num, stakePerNumber));
            }

            setLastSelectedRouletteNumbers([...selectedRouletteNumbers]);
            setSelectedRouletteNumbers([]);
        }
    }, [selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, addLog, setRouletteHistory, setLastRouletteResult]);

    // 4. CRONÔMETRO SINCRONIZADO (16 Segundos)
    useEffect(() => {
        if (!isRouletteMode) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const cycleMs = 16000;
            const elapsed = now % cycleMs;
            const remaining = Math.ceil((cycleMs - elapsed) / 1000);
            const currentRoundId = Math.floor(now / cycleMs);

            setRouletteTimer(remaining === 0 ? 16 : remaining);

            // Fase de Giro (4 segundos antes do fim)
            if (remaining <= 4 && remaining >= 1) {
                setIsRouletteSpinning(true);
            } else {
                setIsRouletteSpinning(false);
            }

            // Limpa o resultado fixo após 5 segundos do novo ciclo
            if (remaining === 11) {
                setLastRouletteResult(null);
            }

            // No exato momento do sorteio (virada do ciclo)
            if (remaining === 16) {
                processRouletteResult(currentRoundId - 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRouletteMode, processRouletteResult, setRouletteTimer, setIsRouletteSpinning, setLastRouletteResult]);

    // 5. WEBSOCKET FEED
    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        } else if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Conta: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const quote = data.tick.quote.toString();
                const digit = parseInt(quote.charAt(quote.length - 1));
                setLastDigits(prev => [digit, ...prev].slice(0, 100));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    const profit = parseFloat(contract.profit);
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) updateSignalResult(signalId, profit > 0 ? 'WIN' : 'LOSS', profit, parseFloat(contract.buy_price));
                }
            }
        }
    }, [asset, setLastDigits, setAccountBalance, updateSignalResult]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect, isSocketOpen } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    useEffect(() => { 
        if (asset !== currentAssetRef.current && isSocketOpen) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            currentAssetRef.current = asset;
        }
    }, [asset, isSocketOpen]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, manualBuy: (type: ContractType) => executeTrade(type), toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, executeTrade, isBotRunning, setIsBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};