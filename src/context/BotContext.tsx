"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';

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
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, patternName: string, barrier?: number } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, martingaleFactor,
        setConsecutiveLosses, isPaused, setIsPaused,
        neuralPredictions, setNeuralPredictions
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    const updateNeuralPredictions = useCallback(() => {
        if (lastDigits.length < 50) return;
        const matrix = Array.from({ length: 10 }, () => new Array(10).fill(0));
        const reversed = [...lastDigits].reverse();
        for (let i = 0; i < reversed.length - 1; i++) matrix[reversed[i]][reversed[i+1]]++;
        const lastDigit = lastDigits[0];
        const transitions = matrix[lastDigit];
        const total = transitions.reduce((a, b) => a + b, 0);
        if (total > 0) setNeuralPredictions(transitions.map(t => (t / total) * 100));
    }, [lastDigits, setNeuralPredictions]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, adjust_start_time: 1, count: 500, end: "latest", start: 1, style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected && asset) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            fetchDerivHistory(asset);
        }
    }, [asset, isConnected, fetchDerivHistory]);

    const processTickData = useCallback((tick: { quote: string, epoch: number }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits((prev: number[]) => [lastDigit, ...prev].slice(0, 500));
        setLastTickEpoch(tick.epoch);
        updateNeuralPredictions();
    }, [setLastDigits, setLastTickEpoch, updateNeuralPredictions]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Sniper: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
            } else if (data?.msg_type === 'history') {
                if (data.history?.prices) {
                    const digits = data.history.prices.map((p: number) => parseInt(String(p).slice(-1)));
                    setLastDigits(digits.reverse());
                }
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                if (data.proposal_open_contract?.is_sold) {
                    setLastCompletedContract(data.proposal_open_contract);
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setTradeStatus, addLog, setLastDigits]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // --- MOTOR DE DECISÃO COM MODO NANO (MICRO-OPERAÇÕES) ---
    const calculateTradeSignal = useCallback(() => {
        if (lastDigits.length < 5) return null;

        // Lógica Micro (I.A NANO)
        if (selectedAIInfo?.id === 'iaNano') {
            const last2 = lastDigits.slice(0, 2);
            
            // Probabilidade Neural por paridade
            const evenProb = neuralPredictions.reduce((acc, val, idx) => idx % 2 === 0 ? acc + val : acc, 0);
            const oddProb = 100 - evenProb;

            // Gatilho: 2 ticks da mesma paridade + Probabilidade Neural favorável > 65%
            const allEven = last2.every(d => d % 2 === 0);
            const allOdd = last2.every(d => d % 2 !== 0);

            if (allEven && oddProb > 65) return { type: 'ODD', contract: 'DIGITODD', name: 'Nano Scalp', details: 'Micro-Imbalanço + Prob. Neural 65%+' };
            if (allOdd && evenProb > 65) return { type: 'EVEN', contract: 'DIGITEVEN', name: 'Nano Scalp', details: 'Micro-Imbalanço + Prob. Neural 65%+' };
            
            return null;
        }

        // Lógica Padrão (I.A WAVE)
        const last4 = lastDigits.slice(0, 4);
        const allEven = last4.every(d => d % 2 === 0);
        const allOdd = last4.every(d => d % 2 !== 0);

        if (allEven) return { type: 'ODD', contract: 'DIGITODD', name: 'Wave Reversão', details: '4 Pares -> Entra Ímpar' };
        if (allOdd) return { type: 'EVEN', contract: 'DIGITEVEN', name: 'Wave Reversão', details: '4 Ímpares -> Entra Par' };

        return null;
    }, [lastDigits, selectedAIInfo, neuralPredictions]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, patternName: string, barrier?: number) => {
        if (!isConnected || isTradeOpen.current || isPaused) return;
        
        const baseStake = parseFloat(initialStake) || 1.00;
        const mgFactor = parseFloat(martingaleFactor) || 1.8;
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        
        const params: any = { 
            amount: parseFloat(stakeToUse.toFixed(2)), 
            basis: 'stake', 
            contract_type: contractType, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol: asset 
        };

        if (barrier !== undefined) params.barrier = barrier;

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, patternName, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current || isPaused) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const signal = calculateTradeSignal();
        if (signal) {
            const sId = addSignal({ 
                strategy: signal.name, 
                signal: signal.type as any, 
                details: signal.details,
                winRate: 'N/A' 
            });
            // Adicionado cast para 'any' para evitar erro de propriedade inexistente ao acessar 'barrier'
            executeBuy(signal.contract as ContractType, signal.name, sId, signal.name, (signal as any).barrier);
        }
    }, [isBotRunning, lastTickEpoch, calculateTradeSignal, addSignal, executeBuy, isPaused]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, exit_tick } = lastCompletedContract;
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const profitValue = parseFloat(profit);

        setAccountBalance((prev: number) => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses((prev: number) => prev + 1);
            setConsecutiveLosses((p: number) => p + 1);
            martingaleLevel.current += 1;
        } else {
            setWins((prev: number) => prev + 1);
            setConsecutiveLosses(0);
            martingaleLevel.current = 0;
        }

        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }

        isTradeOpen.current = false;
        setTradeStatus('IDLE');
        setLastCompletedContract(null);
        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Sniper: Meta Batida!");
    }, [lastCompletedContract, takeProfit, setTotalProfit, setWins, setLosses, setAccountBalance, setTradeStatus, updateSignalResult, addLog]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sniper Parado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            setConsecutiveLosses(0); setIsPaused(false);
            addLog(`Ativado Núcleo: ${selectedAIInfo?.name || 'Manual'}`, "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, setIsPaused, addLog, selectedAIInfo]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating'); }, [setActiveStrategy]);
    const exitToSelection = useCallback(() => { stopBot("Sessão Finalizada"); setAppFlow('selection'); }, [stopBot]);
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};