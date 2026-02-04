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
        setLastTickEpoch,
        isBotRunning,
        accountType, realToken, demoToken,
        isRouletteMode, setRouletteTimer,
        setIsRouletteSpinning,
        setRouletteHistory,
        rouletteHistory,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        setLastSelectedRouletteNumbers,
        duration,
        addSignal, updateSignalResult,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Conectando...', color: 'bg-yellow-500' });

    useEffect(() => {
        lastDigitsRef.current = lastDigits;
    }, [lastDigits]);

    // 1. SINCRONIZAÇÃO INICIAL E REAL-TIME
    const loadHistoryAndSubscribe = useCallback(async () => {
        // Busca histórico global do banco para complementar o local
        const { data, error } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (!error && data) {
            const dbNumbers = data.map(item => item.number);
            setRouletteHistory((prev: number[]) => {
                // Mescla o histórico do banco com o local (priorizando o local se já houver dados)
                const combined = prev.length > 0 ? prev : dbNumbers;
                return combined.slice(0, 100);
            });
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
                    setIsRouletteSpinning(false);
                }
            )
            .subscribe();

        return channel;
    }, [setRouletteHistory, setIsRouletteSpinning]);

    useEffect(() => {
        let channel: any;
        loadHistoryAndSubscribe().then(c => channel = c);
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [loadHistoryAndSubscribe]);

    // 2. EXECUÇÃO DE ORDENS
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number) => {
        if (!isConnected) return;
        const amount = stake || parseFloat(initialStake) || 0.35;
        
        const signalId = addSignal({
            strategy: "Roleta",
            signal: "ODD",
            details: `Aposta em dígito`,
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

    // 3. FINALIZAÇÃO DO CICLO (SINCRONIZADA)
    const handleRouletteCycleEnd = useCallback(async (roundId: number) => {
        if (lastProcessedRoundRef.current === roundId) return;
        lastProcessedRoundRef.current = roundId;

        const resultDigit = lastDigitsRef.current[0];
        if (resultDigit === undefined) return;

        // ATUALIZA LOCALMENTE NA HORA (Garante que o usuário veja o número imediatamente)
        setRouletteHistory((prev: number[]) => {
            if (prev[0] === resultDigit) return prev;
            return [resultDigit, ...prev].slice(0, 100);
        });
        setIsRouletteSpinning(false);

        // Tenta gravar no banco para sincronizar com outros dispositivos
        supabase.from('roulette_results').insert({ 
            number: resultDigit, 
            source: 'Sincronizado' 
        }).then();

        // Processamento de apostas
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            const isWinner = selectedRouletteNumbers.includes(resultDigit);
            const stakeVal = parseFloat(initialStake);
            
            if (isWinner) {
                const profit = stakeVal * 8;
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                addLog(`Vitória!`, "WIN", { profit, strategyName: "Roleta" });
            } else {
                const loss = (stakeVal * selectedRouletteNumbers.length);
                totalProfitRef.current -= loss;
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                addLog(`Derrota.`, "LOSS", { profit: -loss, strategyName: "Roleta" });
            }

            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num));
            }
            setSelectedRouletteNumbers([]);
        }
    }, [selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, addLog, setRouletteHistory, setIsRouletteSpinning]);

    // 4. TIMER GLOBAL SINCRONIZADO
    useEffect(() => {
        if (!isRouletteMode) return;
        
        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const cycleSeconds = 16;
            const remaining = cycleSeconds - (now % cycleSeconds);
            const roundId = Math.floor(Date.now() / (cycleSeconds * 1000));

            setRouletteTimer(remaining);

            if (remaining <= 4) {
                setIsRouletteSpinning(true);
            } else {
                setIsRouletteSpinning(false);
            }

            if (remaining === 16) {
                handleRouletteCycleEnd(roundId - 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRouletteMode, handleRouletteCycleEnd, setRouletteTimer, setIsRouletteSpinning]);

    // 5. WEBSOCKET FEED
    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        } else if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Ativo: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const quote = data.tick.quote.toString();
                const digit = parseInt(quote.charAt(quote.length - 1));
                setLastDigits(prev => [digit, ...prev].slice(0, 200));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    const profit = parseFloat(contract.profit);
                    const isWin = profit > 0;
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) updateSignalResult(signalId, isWin ? 'WIN' : 'LOSS', profit, parseFloat(contract.buy_price));
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