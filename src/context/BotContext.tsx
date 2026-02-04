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

    // 1. SINCRONIZAÇÃO COMPLETA COM O SUPABASE
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
                        return [newNum, ...prev].slice(0, 50);
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

    // 3. SORTEIO E SALVAMENTO
    const handleRouletteCycleEnd = useCallback(async () => {
        const resultDigit = lastDigitsRef.current[0];
        const finalDigit = resultDigit !== undefined ? resultDigit : lastDigitsRef.current[1];
        
        if (finalDigit === undefined) {
            addLog("Aguardando feed de dados para sorteio...", "INFO");
            return;
        }

        // SALVA NO BANCO
        await supabase.from('roulette_results').insert({ 
            number: finalDigit, 
            source: 'Rico 2.0 Engine' 
        });

        // Processamento de apostas
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            const isWinner = selectedRouletteNumbers.includes(finalDigit);
            const stakeVal = parseFloat(initialStake);
            
            if (isWinner) {
                const profit = stakeVal * 8;
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                
                toast.success(`VITÓRIA: ${finalDigit}`, { icon: '🎰' });
                addLog(`Vitória na Roleta! Sorteado: ${finalDigit}`, "WIN", { 
                    profit: profit, 
                    exitDigit: finalDigit,
                    strategyName: "Roleta"
                });
            } else {
                const loss = (stakeVal * selectedRouletteNumbers.length);
                totalProfitRef.current -= loss;
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                
                toast.error(`DERROTA: ${finalDigit}`, { icon: '📉' });
                addLog(`Derrota na Roleta. Sorteado: ${finalDigit}`, "LOSS", { 
                    profit: -loss, 
                    exitDigit: finalDigit,
                    strategyName: "Roleta"
                });
            }

            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num));
            }
            setSelectedRouletteNumbers([]);
        } else {
            // Se não houver aposta, apenas loga o sorteio
            addLog(`Sorteio realizado: ${finalDigit}`, "INFO");
        }
    }, [selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, addLog]);

    // 4. TIMER
    useEffect(() => {
        if (!isRouletteMode) return;
        const interval = setInterval(() => {
            setRouletteTimer((prev: number) => {
                const next = prev <= 1 ? 16 : prev - 1;
                if (next === 4) setIsRouletteSpinning(true);
                if (prev === 1) handleRouletteCycleEnd();
                return next;
            });
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
                addLog(`Conta autorizada: ${data.authorize.email}`, "INFO");
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const quote = data.tick.quote.toString();
                const digit = parseInt(quote.charAt(quote.length - 1));
                setLastDigits(prev => [digit, ...prev].slice(0, 200));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            }
        }
    }, [asset, setLastDigits, setAccountBalance, addLog]);

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