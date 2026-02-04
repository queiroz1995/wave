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

    useEffect(() => {
        lastDigitsRef.current = lastDigits;
    }, [lastDigits]);

    // 1. SINCRONIZAÇÃO INICIAL (BUSCA OS ÚLTIMOS 50 RESULTADOS)
    const setupRealtimeSync = useCallback(async () => {
        if (!asset) return;

        console.log(`[Roleta] Buscando 50 últimos resultados para análise...`);
        
        const { data: historyData, error } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(50); // Ajustado para 50 resultados como solicitado

        if (error) {
            console.error("[Roleta] Erro ao buscar histórico:", error);
        }

        if (historyData && historyData.length > 0) {
            setRouletteHistory(historyData.map(h => h.number));
        }

        // Escuta novos sorteios em tempo real
        const channel = supabase
            .channel('roulette-realtime-50')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'roulette_results' },
                (payload) => {
                    const newDigit = payload.new.number;
                    // Mantém o histórico em 50 itens
                    setRouletteHistory((prev: number[]) => [newDigit, ...prev].slice(0, 50));
                    setIsRouletteSpinning(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [asset, setRouletteHistory, setIsRouletteSpinning]);

    useEffect(() => {
        setupRealtimeSync();
    }, [setupRealtimeSync]);

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
        addLog(`Aposta enviada: ${contractType} (${prediction ?? ''})`, 'TRADE');
    }, [isConnected, initialStake, asset, duration, addLog]);

    // 3. FINALIZAÇÃO DO CICLO
    const handleRouletteCycleEnd = useCallback(async () => {
        const resultDigit = lastDigitsRef.current[0];
        if (resultDigit === undefined) return;

        setIsRouletteSpinning(true);
        
        // Adiciona localmente para feedback imediato
        setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 50));
        
        // Salva no banco para sincronizar todos os usuários
        try {
            await supabase.from('roulette_results').insert({ 
                number: resultDigit, 
                source: 'Rico 2.0 Auto' 
            });
        } catch (e) {
            console.error("Erro ao sincronizar sorteio:", e);
        }

        setTimeout(() => setIsRouletteSpinning(false), 2000);
        
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            const isWinner = selectedRouletteNumbers.includes(resultDigit);
            const stake = parseFloat(initialStake);
            
            if (isWinner) {
                const winAmount = stake * 8;
                totalProfitRef.current += winAmount;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                toast.success(`VITÓRIA! Sorteado: ${resultDigit}`, { icon: '🏆' });
            } else {
                totalProfitRef.current -= (stake * selectedRouletteNumbers.length);
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                toast.error(`Derrota. Sorteado: ${resultDigit}`, { icon: '❌' });
            }

            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num));
            }
            setSelectedRouletteNumbers([]);
        }
    }, [selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, setIsRouletteSpinning, setRouletteHistory]);

    // 4. TEMPORIZADOR
    useEffect(() => {
        if (!isRouletteMode) return;
        const timer = setInterval(() => {
            setRouletteTimer((prev: number) => {
                if (prev <= 1) {
                    handleRouletteCycleEnd();
                    return 16;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRouletteMode, handleRouletteCycleEnd, setRouletteTimer]);

    // 5. WEBSOCKET
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
                setLastTickEpoch(data.tick.epoch);
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            }
        }
    }, [asset, setLastDigits, setLastTickEpoch, setAccountBalance]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect, isSocketOpen } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    useEffect(() => { 
        if (asset !== currentAssetRef.current && isSocketOpen) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            currentAssetRef.current = asset;
            setupRealtimeSync();
        }
    }, [asset, isSocketOpen, setupRealtimeSync]);

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