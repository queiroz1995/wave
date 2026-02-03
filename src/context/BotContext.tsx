"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType, SignalType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';

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
    const martingaleLevel = useRef(0);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ 
        stake: number, 
        strategyName: string, 
        signalId: string | null, 
        contractType: ContractType | null, 
        barrier?: number,
        isManual: boolean 
    } | null>(null);
    
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    // Referência para o tempo do último tick para calcular ritmo
    const lastTickTimestamp = useRef<number>(Date.now());
    const currentAssetRef = useRef<string>('');

    const {
        addLog, setAccountBalance, setChartData, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setCurrentSignal,
        martingaleFactor,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        activeContract, isBotRunning,
        digitTradeMode,
        activeStrategy,
        realToken, demoToken, accountType,
        takeProfit, stopLoss, maxLevels,
        isMartingaleActive,
        manualGaleLevel, setManualGaleLevel,
        isManualGaleActive,
        setMarketPulse, // Corrigido: agora existe no hook
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

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

        // ANALISADOR DE RITMO (PULSO)
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
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Falha na Entrada: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) {
                    setLastCompletedContract(poc);
                    if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id });
                }
            }
        }
    }, [addLog, setAccountBalance, setActiveContract, setTradeStatus, asset, processTickData]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const buyContract = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, stakeAmount: number, barrier: number, isManual: boolean = false) => {
        if (!isConnected) return;
        const stakeNum = parseFloat(stakeAmount.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);
        
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier, isManual };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, asset, setTradeStatus, isConnected]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number, isManual: boolean = false) => {
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;
        
        if (isManual && isManualGaleActive) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, manualGaleLevel);
        } else if (!isManual && isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        
        buyContract(contractType, strategyName, signalId, stakeToUse, barrier, isManual);
    }, [initialStake, martingaleFactor, buyContract, isMartingaleActive, isManualGaleActive, manualGaleLevel]);

    const manualBuy = useCallback((type: ContractType, strategyName: string) => {
        if (!isConnected) return;
        
        if (isTradeOpen.current) {
            addLog("Aguarde a conclusão da ordem anterior.", "ERROR");
            return;
        }

        const sId = addSignal({ strategy: strategyName, signal: type === 'DIGITEVEN' ? 'EVEN' : type === 'DIGITODD' ? 'ODD' : type === 'DIGITOVER' ? 'OVER' : 'UNDER', details: 'Manual' });
        isTradeOpen.current = true;
        executeBuy(type, strategyName, sId, digitPrediction, true);
    }, [isConnected, addSignal, executeBuy, digitPrediction, addLog]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, contract_id, exit_tick } = lastCompletedContract;
        if (activeContract?.contract_id !== contract_id) return;
        
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const lastTrade = lastTradeDetails.current;
        
        setAccountBalance(prev => prev !== null ? prev + parseFloat(profit) : null);
        totalProfitRef.current += parseFloat(profit);
        setTotalProfit(totalProfitRef.current);
        
        if (isLoss) {
            setLosses(prev => prev + 1);
            if (lastTrade?.isManual) {
                if (isManualGaleActive) setManualGaleLevel(prev => prev + 1);
            } else {
                if (isMartingaleActive && isBotRunning) martingaleLevel.current += 1;
            }
            addLog(`LOSS: $${Math.abs(parseFloat(profit)).toFixed(2)}`, 'LOSS', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        } else {
            setWins(prev => prev + 1); 
            if (lastTrade?.isManual) setManualGaleLevel(0);
            else martingaleLevel.current = 0;
            addLog(`WIN: $${parseFloat(profit).toFixed(2)}`, 'WIN', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        }
        
        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        
        isTradeOpen.current = false; 
        setActiveContract(null); 
        setTradeStatus('IDLE'); 
        setLastCompletedContract(null);
    }, [lastCompletedContract, activeContract, isBotRunning, isMartingaleActive, isManualGaleActive, setManualGaleLevel]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const handleDisconnect = useCallback(() => { disconnect(); stopBot("Desconectado"); }, [disconnect, stopBot]);
    
    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Parado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; 
            setTotalProfit(0); 
            setWins(0); 
            setLosses(0); 
            martingaleLevel.current = 0; 
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, manualBuy, fetchClosedHistory: () => {}, clearClosedHistory: () => {},
    }), [stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, manualBuy]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};