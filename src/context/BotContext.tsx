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

    // 1. BUSCA DADOS INICIAIS E CONFIGURA REALTIME
    const setupRealtimeSync = useCallback(async () => {
        if (!asset) return;

        // Carrega os últimos 250 ticks para análise
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

        // Carrega o histórico de 100 rodadas da roleta
        const { data: historyData } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(100);

        if (historyData?.length) {
            setRouletteHistory(historyData.map(h => h.number));
        }

        // INSCREVE PARA ATUALIZAÇÕES EM TEMPO REAL
        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'roulette_results' },
                (payload) => {
                    const newDigit = payload.new.number;
                    // Adiciona o novo número no topo do histórico
                    setRouletteHistory((prev: number[]) => [newDigit, ...prev].slice(0, 100));
                    
                    // Se estivermos em modo roleta, isso sinaliza o fim de um giro
                    setIsRouletteSpinning(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [asset, setLastDigits, setLastTickEpoch, setRouletteHistory, setIsRouletteSpinning]);

    useEffect(() => {
        setupRealtimeSync();
    }, [setupRealtimeSync]);

    // 2. LÓGICA DE OPERAÇÃO
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number, strategyName: string = 'Manual') => {
        if (!isConnected) return;

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

        addLog(`Ordem: ${contractType} (${prediction ?? ''}) | $${amount.toFixed(2)}`, 'TRADE');
        sendMessageRef.current(proposal);
    }, [isConnected, initialStake, asset, duration, addLog]);

    const manualBuy = useCallback((type: ContractType, strategy: string, customStake?: number) => {
        executeTrade(type, undefined, customStake, strategy);
    }, [executeTrade]);

    // LÓGICA DO CRONÔMETRO
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
    }, [isRouletteMode, lastDigits]);

    const handleRouletteCycleEnd = useCallback(async () => {
        setIsRouletteSpinning(true);
        const resultDigit = lastDigits[0];
        
        // Envia para o banco - o Realtime cuidará de atualizar a lista para todos
        await supabase.from('roulette_results').insert({ number: resultDigit, source: 'Rico 2.0' });
        
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
            
            // Verifica ganhos/perdas localmente para feedback imediato
            const isWinner = selectedRouletteNumbers.includes(resultDigit);
            const stake = parseFloat(initialStake);
            
            if (isWinner) {
                const winAmount = stake * 9;
                totalProfitRef.current += winAmount;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                toast.success(`VITÓRIA! O dígito foi ${resultDigit}`);
            } else {
                const totalLoss = stake * selectedRouletteNumbers.length;
                totalProfitRef.current -= totalLoss;
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
            }

            // Se tiver token, executa na Deriv
            if (isConnected) {
                selectedRouletteNumbers.forEach(num => executeTrade('DIGITMATCH' as any, num, undefined, 'Roleta'));
            }
            setSelectedRouletteNumbers([]);
        }
    }, [lastDigits, selectedRouletteNumbers, isConnected, executeTrade, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, setIsRouletteSpinning]);

    // PROCESSAMENTO DE TICKS
    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;

        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);

        // Opcional: Salvar todos os ticks no DB (coleta passiva)
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
            currentAssetRef.current = asset;
        }
    }, [asset, isSocketOpen]);

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