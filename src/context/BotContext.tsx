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
    const manipulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, patternName: string } | null>(null);
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
        setProbabilities, learningData, setLearningData,
        consecutiveLosses, setConsecutiveLosses, isPaused, setIsPaused,
        pauseTimeRemaining, setPauseTimeRemaining,
        isManipulationDetected, setIsManipulationDetected,
        neuralPredictions, setNeuralPredictions
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // --- DETECTOR DE MANIPULAÇÃO REFINADO ---
    const detectMarketManipulation = useCallback(() => {
        if (lastDigits.length < 15) return false;
        
        // Analisamos uma janela maior para evitar falsos positivos
        const last10 = lastDigits.slice(0, 10);
        const last8 = lastDigits.slice(0, 8);

        // 1. Alternância Extrema (Exige 8 dígitos: 0,9,0,9,0,9,0,9)
        let alternating = true;
        for (let i = 0; i < 7; i++) {
            if ((last8[i] % 2 === 0 && last8[i+1] % 2 === 0) || (last8[i] % 2 !== 0 && last8[i+1] % 2 !== 0)) {
                alternating = false;
                break;
            }
        }
        if (alternating) return "Alternância";

        // 2. Sequência Perfeita (Exige 7 dígitos seguidos: 1,2,3,4,5,6,7)
        let seqUp = true, seqDown = true;
        const last7 = lastDigits.slice(0, 7);
        for (let i = 0; i < 6; i++) {
            if (last7[i] !== last7[i+1] - 1) seqUp = false;
            if (last7[i] !== last7[i+1] + 1) seqDown = false;
        }
        if (seqUp || seqDown) return "Sequência";

        return null;
    }, [lastDigits]);

    // --- MOTOR DE PREDIÇÃO NEURAL ---
    const updateNeuralPredictions = useCallback(() => {
        if (lastDigits.length < 50) return;
        const matrix = Array.from({ length: 10 }, () => new Array(10).fill(0));
        const reversed = [...lastDigits].reverse();
        for (let i = 0; i < reversed.length - 1; i++) {
            matrix[reversed[i]][reversed[i+1]]++;
        }
        const lastDigit = lastDigits[0];
        const transitions = matrix[lastDigit];
        const total = transitions.reduce((a, b) => a + b, 0);
        if (total > 0) {
            const preds = transitions.map(t => (t / total) * 100);
            setNeuralPredictions(preds);
        }
    }, [lastDigits, setNeuralPredictions]);

    // Anti-Loss Protection Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPaused && pauseTimeRemaining > 0) {
            interval = setInterval(() => setPauseTimeRemaining((prev: number) => prev - 1), 1000);
        } else if (isPaused && pauseTimeRemaining === 0) {
            setIsPaused(false);
            setConsecutiveLosses(0);
            addLog("Sniper ativo novamente.", "INFO");
        }
        return () => clearInterval(interval);
    }, [isPaused, pauseTimeRemaining, setPauseTimeRemaining, setIsPaused, setConsecutiveLosses, addLog]);

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

    // --- SNIPER ENGINE (SCORE 6+) ---
    const calculateSniperScore = useCallback(() => {
        if (lastDigits.length < 50) return null;

        const manipulation = detectMarketManipulation();
        if (manipulation) {
            if (!isManipulationDetected) {
                setIsManipulationDetected(true);
                addLog(`Scanner: Instabilidade detectada (${manipulation}). Pausando 15s.`, "INFO");
                if (manipulationTimeoutRef.current) clearTimeout(manipulationTimeoutRef.current);
                manipulationTimeoutRef.current = setTimeout(() => setIsManipulationDetected(false), 15000); // Reduzido para 15s
            }
            return null;
        }

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

        let score = 0;
        let signal: 'EVEN' | 'ODD' | null = null;
        let patternName = "";

        // Regra 1: 3 Consecutivos (+3)
        const last3 = lastDigits.slice(0, 3).map(d => d % 2 === 0 ? 'E' : 'O');
        if (last3.every(v => v === 'E')) { score += 3; signal = 'EVEN'; patternName = "3_EVEN"; }
        else if (last3.every(v => v === 'O')) { score += 3; signal = 'ODD'; patternName = "3_ODD"; }

        if (!signal) return null;

        // Regra 2: Probabilidade > 53% (+2)
        const p = signal === 'EVEN' ? probEven : probOdd;
        if (p > 0.53) score += 2;

        // Regra 3: Confirmação Rede Neural (+2)
        const neuralProb = neuralPredictions.reduce((acc, val, idx) => {
            if (signal === 'EVEN' && idx % 2 === 0) return acc + val;
            if (signal === 'ODD' && idx % 2 !== 0) return acc + val;
            return acc;
        }, 0) / 100;
        if (neuralProb > 0.51) score += 2;

        // Regra 4: Sem sequência extrema (+1)
        score += 1;

        // Sistema de Aprendizado
        const stats = learningData[patternName];
        if (stats && stats.total >= 3) {
            const winrate = (stats.wins / stats.total) * 100;
            if (winrate < 50) score -= 3;
            else if (winrate > 55) score += 1;
        }

        return { score, signal, patternName, prob: p, neural: neuralProb };
    }, [lastDigits, setProbabilities, learningData, neuralPredictions, detectMarketManipulation, isManipulationDetected, setIsManipulationDetected, addLog]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, patternName: string) => {
        if (!isConnected || isTradeOpen.current || isPaused || isManipulationDetected) return;
        const baseStake = parseFloat(initialStake) || 1.00;
        const mgFactor = parseFloat(martingaleFactor) || 1.8;
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        const params = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, patternName };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused, isManipulationDetected]);

    // Logic Loop
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current || isPaused || isManipulationDetected) return;
        processedTickEpoch.current = lastTickEpoch;
        const analysis = calculateSniperScore();
        if (analysis && analysis.score >= scoreThreshold) {
            const contract: ContractType = analysis.signal === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
            const sId = addSignal({ 
                strategy: `SNIPER (${analysis.patternName})`, 
                signal: analysis.signal, 
                details: `Score: ${analysis.score}/9 | IA: ${(analysis.neural * 100).toFixed(0)}%`,
                winRate: `${(analysis.prob * 100).toFixed(0)}%` 
            });
            executeBuy(contract, `SNIPER (${analysis.score})`, sId, analysis.patternName);
        }
    }, [isBotRunning, lastTickEpoch, calculateSniperScore, scoreThreshold, addSignal, executeBuy, isPaused, isManipulationDetected]);

    // Handle Trade Result
    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, exit_tick } = lastCompletedContract;
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const profitValue = parseFloat(profit);

        setAccountBalance((prev: number) => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        const pattern = lastTradeDetails.current?.patternName;
        if (pattern) {
            setLearningData((prev: any) => {
                const current = prev[pattern] || { wins: 0, losses: 0, total: 0 };
                return { ...prev, [pattern]: { wins: current.wins + (isLoss ? 0 : 1), losses: current.losses + (isLoss ? 1 : 0), total: current.total + 1 } };
            });
        }

        if (isLoss) {
            setLosses((prev: number) => prev + 1);
            const newLossCount = consecutiveLosses + 1;
            setConsecutiveLosses(newLossCount);
            martingaleLevel.current += 1;
            if (newLossCount >= 3) {
                setIsPaused(true);
                setPauseTimeRemaining(120);
                addLog("SNIPER OFF: Proteção 2min.", "ERROR");
            }
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
        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Alvo Atingido!");
    }, [lastCompletedContract, takeProfit, setTotalProfit, setWins, setLosses, setAccountBalance, setTradeStatus, updateSignalResult, addLog, setLearningData, consecutiveLosses, setConsecutiveLosses, setIsPaused, setPauseTimeRemaining]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sniper Abortado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            setConsecutiveLosses(0); setIsPaused(false); setIsManipulationDetected(false);
            addLog("Sniper Online: Calibrando sinais...", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, setIsPaused, addLog, setIsManipulationDetected]);

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