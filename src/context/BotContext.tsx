"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
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

    const [appFlow, setAppFlow] = useState<'selection' | 'operating'>('selection');
    const [selectedAIInfo, setSelectedAIInfo] = useState<any>(null);

    const isTradeOpen = useRef(false);
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const previousAsset = useRef<string | null>(null);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setCurrentSignal,
        martingaleFactor,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        activeContract, isBotRunning,
        activeStrategy, setActiveStrategy,
        realToken, demoToken, accountType,
        takeProfit, maxLevels,
        isMartingaleActive,
        digitTradeMode,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [priceHistory, setPriceHistory] = useState<number[]>([]);

    const fetchInitialTicks = useCallback(async () => {
        if (!asset) return;
        try {
            setLastDigits([]);
            setLastTickEpoch(null);
            setPriceHistory([]);
            
            const { data, error } = await supabase.from('ticks').select('digit, epoch').eq('symbol', asset).order('epoch', { ascending: false }).limit(250);
            if (!error && data?.length > 0) {
                setLastDigits(data.map(t => t.digit));
                setLastTickEpoch(data[0].epoch);
            }
        } catch (e) {}
    }, [asset, setLastDigits, setLastTickEpoch]);

    useEffect(() => { 
        fetchInitialTicks(); 
        if (isConnected && previousAsset.current && previousAsset.current !== asset) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            addLog(`Sincronizando com novo mercado: ${asset}`, 'INFO');
        }
        previousAsset.current = asset;
    }, [asset, fetchInitialTicks, isConnected, addLog]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setPriceHistory(prev => [price, ...prev].slice(0, 100));
        setLastTickEpoch(tick.epoch);
    }, [setLastDigits, setLastTickEpoch]);

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
                    addLog(`Erro: ${data.error.message}`, "ERROR");
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

    const buyContract = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, stakeAmount: number, barrier: number) => {
        if (!isConnected) return;
        const stakeNum = parseFloat(stakeAmount.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') {
            params.barrier = String(barrier);
        }
        
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, asset, setTradeStatus, isConnected]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number) => {
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;
        if (isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        buyContract(contractType, strategyName, signalId, stakeToUse, barrier);
    }, [initialStake, martingaleFactor, buyContract, isMartingaleActive]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        let contract: ContractType | null = null;
        let strategyName = '';
        let barrier = digitPrediction;

        // Análise Global de Multi-Modalidade
        const isUpTrend = priceHistory.length > 5 && priceHistory[0] > priceHistory[4];
        const isDownTrend = priceHistory.length > 5 && priceHistory[0] < priceHistory[4];
        const parities = lastDigits.slice(0, 10).map(d => d % 2 === 0 ? 'E' : 'O');
        const lastDigitsSample = lastDigits.slice(0, 20);

        // MOTOR DE DECISÃO MULTIMODAL (Busca de Lucro)
        if (activeStrategy) {
            // 1. Prioridade: Saturação de Dígitos (Over/Under) - Lucro Rápido
            const smalls = lastDigitsSample.filter(d => d <= 1).length;
            const bigs = lastDigitsSample.filter(d => d >= 8).length;

            if (smalls >= 5) {
                contract = 'DIGITOVER';
                barrier = 1;
                strategyName = "I.A Titan (Over 1 - Saturação Baixa)";
            } else if (bigs >= 5) {
                contract = 'DIGITUNDER';
                barrier = 8;
                strategyName = "I.A Titan (Under 8 - Saturação Alta)";
            } 
            // 2. Secundária: Tendência de Preço (Rise/Fall) - Momentum
            else if (isUpTrend && lastDigits[0] < 7) {
                contract = 'CALL';
                strategyName = "I.A Wave (Momentum de Subida)";
            } else if (isDownTrend && lastDigits[0] > 2) {
                contract = 'PUT';
                strategyName = "I.A Wave (Momentum de Descida)";
            }
            // 3. Terciária: Padrões de Paridade (Even/Odd) - Estabilidade
            else {
                const last3 = parities.slice(0, 3);
                if (last3.every(p => p === 'E')) {
                    contract = 'DIGITODD';
                    strategyName = "I.A Rico (Reversão de Par)";
                } else if (last3.every(p => p === 'O')) {
                    contract = 'DIGITEVEN';
                    strategyName = "I.A Rico (Reversão de Ímpar)";
                }
            }
        }

        if (contract) {
            const signalType = contract.includes('DIGIT') 
                ? (contract === 'DIGITEVEN' ? 'EVEN' : contract === 'DIGITODD' ? 'ODD' : contract === 'DIGITOVER' ? 'OVER' : 'UNDER')
                : (contract === 'CALL' ? 'CALL' : 'PUT');

            const sId = addSignal({ 
                strategy: strategyName, 
                signal: signalType as any, 
                details: `Modalidade: ${contract}`, 
                winRate: 'Otimizada' 
            });
            isTradeOpen.current = true; 
            executeBuy(contract, strategyName, sId, barrier);
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, activeStrategy, initialStake, martingaleFactor, executeBuy, addSignal, priceHistory, digitPrediction]);

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
            if (isMartingaleActive) martingaleLevel.current += 1;
        } else {
            setWins(prev => prev + 1); 
            martingaleLevel.current = 0;
        }
        
        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        isTradeOpen.current = false; setActiveContract(null); setTradeStatus('IDLE'); setLastCompletedContract(null);

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta Batida!");
        if (martingaleLevel.current > maxLevels) martingaleLevel.current = 0;
    }, [lastCompletedContract, activeContract, takeProfit, maxLevels, isMartingaleActive, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult]);

    const selectAI = useCallback((ia: any) => {
        setSelectedAIInfo(ia);
        setActiveStrategy(ia.id);
        setAppFlow('operating');
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => {
        stopBot("Sessão Encerrada");
        setAppFlow('selection');
        setSelectedAIInfo(null);
    }, [stopBot]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Parado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); 
            martingaleLevel.current = 0; 
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};