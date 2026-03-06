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
    const tradeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const accumulatedLoss = useRef(0.00); 
    const martingaleLevel = useRef(0);

    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number, patternName: string } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, martingaleFactor, scoreThreshold,
        probabilities, setProbabilities, learningData, setLearningData,
        consecutiveLosses, setConsecutiveLosses, isPaused, setIsPaused,
        pauseTimeRemaining, setPauseTimeRemaining
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // Anti-Loss Protection Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPaused && pauseTimeRemaining > 0) {
            interval = setInterval(() => setPauseTimeRemaining(prev => prev - 1), 1000);
        } else if (isPaused && pauseTimeRemaining === 0) {
            setIsPaused(false);
            setConsecutiveLosses(0);
            addLog("Resfriamento anti-loss concluído. Retomando análise.", "INFO");
        }
        return () => clearInterval(interval);
    }, [isPaused, pauseTimeRemaining, setPauseTimeRemaining, setIsPaused, setConsecutiveLosses, addLog]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, adjust_start_time: 1, count: 250, end: "latest", start: 1, style: "ticks" });
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
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);
    }, [setLastDigits, setLastTickEpoch]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Online: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
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

    // --- MOTOR DE ANÁLISE E APRENDIZADO IA ---
    const calculateNeuralScore = useCallback(() => {
        if (lastDigits.length < 100) return null;

        const getParityFreq = (window: number) => {
            const slice = lastDigits.slice(0, window);
            const evens = slice.filter(d => d % 2 === 0).length;
            return evens / window;
        };

        const f20 = getParityFreq(20);
        const f50 = getParityFreq(50);
        const f100 = getParityFreq(100);
        const probEven = (f20 * 0.4) + (f50 * 0.3) + (f100 * 0.3);
        const probOdd = 1 - probEven;
        setProbabilities({ even: probEven * 100, odd: probOdd * 100 });

        const last5 = lastDigits.slice(0, 5).map(d => d % 2 === 0 ? 'E' : 'O');
        
        // Filtro de Segurança 5 pares/ímpares ou alternância
        if (last5.every(v => v === 'E') || last5.every(v => v === 'O')) return null;
        const isAlt = last5[0] !== last5[1] && last5[1] !== last5[2] && last5[2] !== last5[3];
        if (isAlt) return null;

        let score = 0;
        let signal: 'EVEN' | 'ODD' | null = null;
        let patternName = "";

        // Regra: 3 pares/ímpares consecutivos (+3)
        const last3 = last5.slice(0, 3);
        if (last3.every(v => v === 'E')) { score += 3; signal = 'EVEN'; patternName = "3_EVEN"; }
        else if (last3.every(v => v === 'O')) { score += 3; signal = 'ODD'; patternName = "3_ODD"; }

        if (!signal) return null;

        // Probabilidade > 55% (+2)
        if (signal === 'EVEN' && probEven > 0.55) score += 2;
        if (signal === 'ODD' && probOdd > 0.55) score += 2;

        // Bônus de Estabilidade (+1)
        score += 1;

        // --- ADAPTAÇÃO AUTOMÁTICA DA IA ---
        const stats = learningData[patternName];
        if (stats && stats.total >= 5) {
            const winrate = (stats.wins / stats.total) * 100;
            if (winrate < 50) {
                score -= 3; // Penalidade: Reduzir uso de padrões com winrate baixo
            } else if (winrate > 60) {
                score += 2; // Bônus: Priorizar padrões vencedores
            }
        }

        return { score, signal, patternName, prob: signal === 'EVEN' ? probEven : probOdd };
    }, [lastDigits, setProbabilities, learningData]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, patternName: string) => {
        if (!isConnected || isTradeOpen.current || isPaused) return;

        const baseStake = parseFloat(initialStake) || 1.00;
        const mgFactor = parseFloat(martingaleFactor) || 1.8;
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;

        const params = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        
        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, patternName };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused]);

    // Trade Logic Loop
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current || isPaused) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const analysis = calculateNeuralScore();
        if (analysis && analysis.score >= scoreThreshold) {
            const contract: ContractType = analysis.signal === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
            const sId = addSignal({ 
                strategy: `IA WAVE (${analysis.patternName})`, 
                signal: analysis.signal, 
                details: `Score: ${analysis.score} | Prob: ${(analysis.prob * 100).toFixed(1)}%`,
                winRate: `${(analysis.prob * 100).toFixed(0)}%` 
            });
            executeBuy(contract, `IA WAVE (${analysis.score})`, sId, analysis.patternName);
        }
    }, [isBotRunning, lastTickEpoch, calculateNeuralScore, scoreThreshold, addSignal, executeBuy, isPaused]);

    // Handle Trade Result and Learning
    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, exit_tick } = lastCompletedContract;
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const profitValue = parseFloat(profit);

        setAccountBalance(prev => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        // --- SISTEMA DE APRENDIZADO (SALVAR RESULTADO) ---
        const pattern = lastTradeDetails.current?.patternName;
        if (pattern) {
            setLearningData((prev: any) => {
                const current = prev[pattern] || { wins: 0, losses: 0, total: 0 };
                return {
                    ...prev,
                    [pattern]: {
                        wins: current.wins + (isLoss ? 0 : 1),
                        losses: current.losses + (isLoss ? 1 : 0),
                        total: current.total + 1
                    }
                };
            });
        }

        if (isLoss) {
            setLosses(prev => prev + 1);
            const newLossCount = consecutiveLosses + 1;
            setConsecutiveLosses(newLossCount);
            martingaleLevel.current += 1;
            if (newLossCount >= 3) {
                setIsPaused(true);
                setPauseTimeRemaining(120);
                addLog("CRÍTICO: 3 perdas seguidas. Pausando 2 minutos para proteção.", "ERROR");
            }
        } else {
            setWins(prev => prev + 1);
            setConsecutiveLosses(0);
            martingaleLevel.current = 0;
            if (martingaleLevel.current > 0) addLog("Recuperação concluída!", "WIN");
        }

        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }

        isTradeOpen.current = false;
        setTradeStatus('IDLE');
        setLastCompletedContract(null);
        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta Batida!");
    }, [lastCompletedContract, takeProfit, setTotalProfit, setWins, setLosses, setAccountBalance, setTradeStatus, updateSignalResult, addLog, setLearningData, consecutiveLosses, setConsecutiveLosses, setIsPaused, setPauseTimeRemaining]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sessão Finalizada");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            setConsecutiveLosses(0); setIsPaused(false);
            addLog("IA Learning Online: Otimizando estratégia...", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, setIsPaused, addLog]);

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