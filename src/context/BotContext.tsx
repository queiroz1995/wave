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
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // FUNÇÃO PARA EXECUTAR COMPRA NA DERIV
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number, strategyName: string = 'Manual') => {
        if (!isConnected) {
            toast.error("Conecte-se antes de operar!");
            return;
        }

        const amount = stake || parseFloat(initialStake) || 0.35;
        const proposal = {
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
            }
        };

        addLog(`Iniciando ${strategyName}: ${contractType} com $${amount.toFixed(2)}`, 'TRADE', { stake: amount, strategyName });
        sendMessageRef.current(proposal);
    }, [isConnected, initialStake, asset, duration, addLog]);

    // APOSTA MANUAL DO PAINEL PRINCIPAL
    const manualBuy = useCallback((type: ContractType, strategy: string, customStake?: number) => {
        executeTrade(type, undefined, customStake, strategy);
    }, [executeTrade]);

    // LÓGICA DO TEMPORIZADOR DA ROLETA (16s)
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
    }, [isRouletteMode, selectedRouletteNumbers]);

    const handleRouletteResult = useCallback(() => {
        setIsRouletteSpinning(true);
        const resultDigit = lastDigits[0];
        
        // Se houver aposta, salva como a última
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
        }

        // Se estiver conectado, tenta fazer as apostas reais de Match
        if (isConnected && selectedRouletteNumbers.length > 0) {
            selectedRouletteNumbers.forEach((num: number) => {
                executeTrade('DIGITMATCH' as any, num, undefined, 'Roleta');
            });
        }

        setTimeout(() => {
            setIsRouletteSpinning(false);
            setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 16));
            
            if (selectedRouletteNumbers.length > 0) {
                const isWinner = selectedRouletteNumbers.includes(resultDigit);
                const stake = parseFloat(initialStake);
                
                if (isWinner) {
                    const winAmount = stake * 9; 
                    totalProfitRef.current += winAmount;
                    setTotalProfit(totalProfitRef.current);
                    setWins(prev => prev + 1);
                    toast.success(`ROLETA: VITÓRIA! Dígito ${resultDigit}`, { description: `Lucro: +$${winAmount.toFixed(2)}` });
                    addLog(`VITÓRIA ROLETA: Dígito ${resultDigit}`, 'WIN', { profit: winAmount });
                } else {
                    const totalLoss = stake * selectedRouletteNumbers.length;
                    totalProfitRef.current -= totalLoss;
                    setTotalProfit(totalProfitRef.current);
                    setLosses(prev => prev + 1);
                    toast.error(`ROLETA: DERROTA. Dígito ${resultDigit}`, { description: `Prejuízo: -$${totalLoss.toFixed(2)}` });
                    addLog(`DERROTA ROLETA: Dígito ${resultDigit}`, 'LOSS', { profit: -totalLoss });
                }
            }
            setSelectedRouletteNumbers([]); 
        }, 3000);
    }, [lastDigits, selectedRouletteNumbers, initialStake, isConnected, executeTrade, addLog, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers]);

    const fetchInitialTicks = useCallback(async () => {
        if (!asset) return;
        try {
            const { data, error } = await supabase.from('ticks').select('digit, epoch').eq('symbol', asset).order('epoch', { ascending: false }).limit(250);
            if (!error && data?.length > 0) {
                setLastDigits(data.map(t => t.digit));
                setLastTickEpoch(data[0].epoch);
            }
        } catch (e) {}
    }, [asset, setLastDigits, setLastTickEpoch]);

    useEffect(() => { 
        if (asset !== currentAssetRef.current) {
            if (isConnected) {
                sendMessageRef.current({ forget_all: 'ticks' });
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
            }
            fetchInitialTicks();
            currentAssetRef.current = asset;
        }
    }, [asset, isConnected, fetchInitialTicks]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const now = Date.now();
        const diff = (now - lastTickTimestamp.current) / 1000;
        lastTickTimestamp.current = now;
        if (diff > 1.8) setMarketPulse('calm');
        else if (diff > 0.8) setMarketPulse('stable');
        else setMarketPulse('aggressive');

        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);
        setChartData(prev => [...prev, { time: new Date(tick.epoch * 1000).toLocaleTimeString('pt-BR', { hour12: false }), price: parseFloat(tick.quote) }].slice(-50));
    }, [setLastDigits, setLastTickEpoch, setChartData, setMarketPulse]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Conectado - ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    setActiveContract({ contract_id: data.buy.contract_id }); 
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) {
                    setLastCompletedContract(poc);
                    if (poc.status === 'won') {
                        setAccountBalance(poc.balance_after);
                    }
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setActiveContract, setTradeStatus]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const handleDisconnect = useCallback(() => { disconnect(); setIsBotRunning(false); }, [disconnect, setIsBotRunning]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect, manualBuy, toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, handleDisconnect, manualBuy, isBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};