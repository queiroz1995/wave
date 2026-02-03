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

    const isTradeOpen = useRef(false);
    const totalProfitRef = useRef(0.00);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const lastTickTimestamp = useRef<number>(Date.now());
    const currentAssetRef = useRef<string>('');

    const {
        addLog, setAccountBalance, setChartData, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setLastTickEpoch,
        setTradeStatus,
        isBotRunning,
        setMarketPulse,
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

    // CARREGA DADOS DO SUPABASE AO ABRIR/TROCAR ATIVO
    const fetchInitialData = useCallback(async () => {
        if (!asset) return;
        
        // 1. Busca os últimos 250 ticks para estatísticas e análise
        const { data: ticksData } = await supabase
            .from('ticks')
            .select('digit, epoch')
            .eq('symbol', asset)
            .order('epoch', { ascending: false })
            .limit(250);

        if (ticksData?.length) {
            setLastDigits(ticksData.map(t => t.digit));
            setLastTickEpoch(ticksData[0].epoch);
        }

        // 2. Busca as últimas 100 rodadas reais da roleta para o histórico visual
        const { data: historyData } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(100);

        if (historyData?.length) {
            setRouletteHistory(historyData.map(h => h.number));
        }
    }, [asset, setLastDigits, setLastTickEpoch, setRouletteHistory]);

    // Executa a busca inicial
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number, strategyName: string = 'Manual') => {
        if (!isConnected) {
            toast.error("Token não conectado!");
            return;
        }

        const amount = stake || parseFloat(initialStake) || 0.35;
        const proposal = {
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
        };

        addLog(`Ordem Real: ${contractType} (${prediction ?? ''}) | $${amount.toFixed(2)}`, 'TRADE');
        sendMessageRef.current(proposal);
    }, [isConnected, initialStake, asset, duration, addLog]);

    const manualBuy = useCallback((type: ContractType, strategy: string, customStake?: number) => {
        executeTrade(type, undefined, customStake, strategy);
    }, [executeTrade]);

    useEffect(() => {
        if (!isRouletteMode) return;
        const timer = setInterval(() => {
            setRouletteTimer((prev: number) => {
                if (prev <= 1) {
                    handleRouletteResult();
                    return 16;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRouletteMode, lastDigits]);

    const handleRouletteResult = useCallback(async () => {
        setIsRouletteSpinning(true);
        const resultDigit = lastDigits[0];
        
        await supabase.from('roulette_results').insert({ number: resultDigit, source: 'Rico 2.0' });
        
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num, undefined, 'Roleta'));
            }
        }

        setTimeout(() => {
            setIsRouletteSpinning(false);
            setRouletteHistory(prev => [resultDigit, ...prev].slice(0, 100));
            
            if (selectedRouletteNumbers.length > 0) {
                const isWinner = selectedRouletteNumbers.includes(resultDigit);
                const stake = parseFloat(initialStake);
                if (isWinner) {
                    const winAmount = stake * 9;
                    totalProfitRef.current += winAmount;
                    setTotalProfit(totalProfitRef.current);
                    setWins(prev => prev + 1);
                } else {
                    const totalLoss = stake * selectedRouletteNumbers.length;
                    totalProfitRef.current -= totalLoss;
                    setTotalProfit(totalProfitRef.current);
                    setLosses(prev => prev + 1);
                }
            }
            setSelectedRouletteNumbers([]); 
        }, 3000);
    }, [lastDigits, selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setRouletteHistory, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;

        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);

        supabase.from('ticks').upsert({
            symbol: tick.symbol,
            epoch: tick.epoch,
            digit: lastDigit,
            type: 'live'
        }, { onConflict: 'symbol,epoch' });
    }, [setLastDigits, setLastTickEpoch]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            return;
        }
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Ativo: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } 
            else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                processTickData(data.tick);
            }
            else if (data?.msg_type === 'balance' && data.balance?.balance !== undefined) {
                setAccountBalance(data.balance.balance);
            }
        }
    }, [asset, processTickData, setAccountBalance]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect, isSocketOpen } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    useEffect(() => { 
        if (asset !== currentAssetRef.current && isSocketOpen) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            fetchInitialData();
            currentAssetRef.current = asset;
        }
    }, [asset, isSocketOpen, fetchInitialData]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, manualBuy, toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, manualBuy, isBotRunning, setIsBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};