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
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        setLastSelectedRouletteNumbers,
        duration,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Conectando...', color: 'bg-yellow-500' });

    // Mantém o ref atualizado para uso em callbacks do timer
    useEffect(() => {
        lastDigitsRef.current = lastDigits;
    }, [lastDigits]);

    // 1. SINCRONIZAÇÃO INICIAL E REALTIME (CORRIGIDO)
    const initDatabaseSync = useCallback(async () => {
        console.log("[Rico 2.0] Buscando histórico inicial...");
        
        // Busca os 50 mais recentes
        const { data: historyData, error } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (!error && historyData && historyData.length > 0) {
            const numbers = historyData.map(h => h.number);
            setRouletteHistory(numbers);
        } else {
            console.log("[Rico 2.0] Banco vazio ou erro, usando dígitos da Deriv como base.");
            // Fallback: se o banco estiver vazio, usa os dígitos que já temos da Deriv
            if (lastDigitsRef.current.length > 0) {
                setRouletteHistory(lastDigitsRef.current.slice(0, 50));
            }
        }

        // Inscreve no Realtime para atualizações imediatas
        const channel = supabase
            .channel('db_roulette_sync')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'roulette_results' },
                (payload) => {
                    const newDigit = payload.new.number;
                    setRouletteHistory((prev: number[]) => {
                        // Evita duplicatas se o insert local já tiver ocorrido
                        if (prev[0] === newDigit) return prev;
                        return [newDigit, ...prev].slice(0, 50);
                    });
                    setIsRouletteSpinning(false);
                }
            )
            .subscribe();

        return channel;
    }, [setRouletteHistory, setIsRouletteSpinning]);

    useEffect(() => {
        let channel: any;
        initDatabaseSync().then(c => channel = c);
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [initDatabaseSync]);

    // 2. LÓGICA DE TRADES
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number) => {
        if (!isConnected) return;
        const amount = stake || parseFloat(initialStake) || 0.35;
        sendMessageRef.current({
            buy: 1,
            price: amount,
            parameters: {
                amount: amount,
                basis: 'stake',
                contract_type: contractType,
                currency: 'USD',
                duration: duration,
                duration_unit: 't',
                symbol: asset,
                barrier: prediction !== undefined ? String(prediction) : undefined
            }
        });
    }, [isConnected, initialStake, asset, duration]);

    // 3. FINALIZAÇÃO DO CICLO (Sorteio e Salvamento)
    const handleRouletteCycleEnd = useCallback(async () => {
        // Pega o último dígito gerado pela Deriv
        const resultDigit = lastDigitsRef.current[0];
        if (resultDigit === undefined) return;

        console.log(`[Rico 2.0] Sorteado: ${resultDigit}. Salvando no banco...`);

        // Atualiza localmente imediato para melhor UX
        setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 50));
        setIsRouletteSpinning(false);

        // Salva no banco de dados
        try {
            await supabase.from('roulette_results').insert({ 
                number: resultDigit, 
                source: 'Rico 2.0 Auto' 
            });
        } catch (e) {
            console.error("Erro ao salvar no Supabase:", e);
        }

        // Lógica de apostas
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            const isWinner = selectedRouletteNumbers.includes(resultDigit);
            const stake = parseFloat(initialStake);
            
            if (isWinner) {
                // Cálculo simplificado de lucro
                totalProfitRef.current += stake * 8; 
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                toast.success(`VITÓRIA! Sorteado: ${resultDigit}`, { icon: '🏆', duration: 4000 });
            } else {
                totalProfitRef.current -= (stake * selectedRouletteNumbers.length);
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                toast.error(`Derrota. Sorteado: ${resultDigit}`, { icon: '❌', duration: 4000 });
            }

            if (isConnected) {
                // Se conectado, executa as ordens na corretora
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num));
            }
            setSelectedRouletteNumbers([]);
        }
    }, [selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, setIsRouletteSpinning, setRouletteHistory]);

    // 4. TEMPORIZADOR DA ROLETA
    useEffect(() => {
        if (!isRouletteMode) return;
        const timer = setInterval(() => {
            setRouletteTimer((prev: number) => {
                const nextValue = prev <= 1 ? 16 : prev - 1;
                
                // Ativa animação nos 4 segundos finais
                if (nextValue === 4) {
                    setIsRouletteSpinning(true);
                }

                if (prev === 1) {
                    handleRouletteCycleEnd();
                }
                
                return nextValue;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRouletteMode, handleRouletteCycleEnd, setRouletteTimer, setIsRouletteSpinning]);

    // 5. WEBSOCKET (Deriv Feed)
    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        } else if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Conectado: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const digit = parseInt(String(data.tick.quote).slice(-1));
                setLastDigits(prev => [digit, ...prev].slice(0, 250));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            }
        }
    }, [asset, setLastDigits, setAccountBalance]);

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