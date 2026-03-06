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
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        activeContract, isBotRunning,
        setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit,
        martingaleFactor,
        scoreThreshold,
        probabilities, setProbabilities,
        consecutiveLosses, setConsecutiveLosses,
        isPaused, setIsPaused,
        pauseTimeRemaining, setPauseTimeRemaining
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // Timer para o Anti-Loss Pause
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPaused && pauseTimeRemaining > 0) {
            interval = setInterval(() => {
                setPauseTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (isPaused && pauseTimeRemaining === 0) {
            setIsPaused(false);
            setConsecutiveLosses(0);
            addLog("Pausa anti-loss finalizada. Sistema pronto para operar.", "INFO");
        }
        return () => clearInterval(interval);
    }, [isPaused, pauseTimeRemaining, setPauseTimeRemaining, setIsPaused, setConsecutiveLosses, addLog]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        addLog(`Sincronizando fluxo neural...`, 'INFO');
        sendMessageRef.current({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 250,
            end: "latest",
            start: 1,
            style: "ticks"
        });
    }, [addLog]);

    useEffect(() => { 
        if (isConnected && asset) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            fetchDerivHistory(asset);
        }
    }, [asset, isConnected, fetchDerivHistory]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
        martingaleLevel.current = 0;
        accumulatedLoss.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
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
                    setActiveContract({ contract_id: data.buy.contract_id }); 
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
    }, [asset, processTickData, setAccountBalance, setActiveContract, setTradeStatus, addLog, setLastDigits]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // --- MOTOR DE ANÁLISE ESTATÍSTICA E SCORE ---
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

        // Probabilidade Ponderada: 40% (20 ticks), 30% (50 ticks), 30% (100 ticks)
        const probEven = (f20 * 0.4) + (f50 * 0.3) + (f100 * 0.3);
        const probOdd = 1 - probEven;

        setProbabilities({ even: probEven * 100, odd: probOdd * 100 });

        // Cálculo de Score
        let currentScore = 0;
        let signal: 'EVEN' | 'ODD' | null = null;

        const lastSequence = [];
        for(let i=0; i<5; i++) {
            lastSequence.push(lastDigits[i] % 2 === 0 ? 'E' : 'O');
        }

        // Filtro de Segurança 1: Evitar sequências extremas (> 5)
        const isExtremeStreak = lastSequence.every(v => v === 'E') || lastSequence.every(v => v === 'O');
        if (isExtremeStreak) return { score: 0, signal: null, reason: 'FILTRO: Sequência Extrema' };

        // Filtro de Segurança 2: Alternância excessiva
        const isAlternating = lastSequence[0] !== lastSequence[1] && lastSequence[1] !== lastSequence[2] && lastSequence[2] !== lastSequence[3];
        if (isAlternating) return { score: 0, signal: null, reason: 'FILTRO: Alta Alternância' };

        // Sistema de Pontuação
        const last3 = lastSequence.slice(0, 3);
        const is3Even = last3.every(v => v === 'E');
        const is3Odd = last3.every(v => v === 'O');

        if (is3Even) {
            currentScore += 3;
            signal = 'EVEN';
        } else if (is3Odd) {
            currentScore += 3;
            signal = 'ODD';
        }

        if (signal === 'EVEN' && probEven > 0.55) currentScore += 2;
        if (signal === 'ODD' && probOdd > 0.55) currentScore += 2;

        // Bônus de Estabilidade (sem sequência extrema nos últimos 10)
        currentScore += 1;

        return { score: currentScore, signal };
    }, [lastDigits, setProbabilities]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number) => {
        if (!isConnected || isTradeOpen.current || isPaused) return;

        const baseStake = parseFloat(initialStake) || 1.00;
        const mgFactor = parseFloat(martingaleFactor) || 1.8;
        let stakeToUse = baseStake;

        if (martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(mgFactor, martingaleLevel.current);
        } 

        const params: any = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = setTimeout(() => {
            if (isTradeOpen.current) {
                isTradeOpen.current = false;
                setTradeStatus('IDLE');
            }
        }, 8000);

        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused]);

    // --- LOOP PRINCIPAL DE DECISÃO ---
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current || isPaused) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const analysis = calculateNeuralScore();
        if (!analysis || !analysis.signal) return;

        if (analysis.score >= scoreThreshold) {
            const contract: ContractType = analysis.signal === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
            const strategyName = `IA WAVE (Score: ${analysis.score})`;

            const sId = addSignal({ 
                strategy: strategyName, 
                signal: analysis.signal, 
                details: `Prob: ${analysis.signal === 'EVEN' ? probabilities.even.toFixed(1) : probabilities.odd.toFixed(1)}%`, 
                winRate: `${(analysis.score * 10).toFixed(0)}%` 
            });
            executeBuy(contract, strategyName, sId, 0);
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, executeBuy, addSignal, calculateNeuralScore, scoreThreshold, probabilities, isPaused]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, contract_id, exit_tick } = lastCompletedContract;
        if (activeContract?.contract_id !== contract_id) return;

        const isLoss = status === 'lost';
        const profitValue = parseFloat(profit);
        const exitDigit = parseInt(String(exit_tick).slice(-1));

        setAccountBalance(prev => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses(prev => prev + 1);
            const newLossCount = consecutiveLosses + 1;
            setConsecutiveLosses(newLossCount);
            martingaleLevel.current += 1;
            
            // Proteção Anti-Loss: Pausa de 2 minutos após 3 perdas
            if (newLossCount >= 3) {
                setIsPaused(true);
                setPauseTimeRemaining(120);
                addLog("CRÍTICO: 3 perdas seguidas. Pausando operações por 2 minutos para proteção.", "ERROR");
            } else {
                addLog(`Red detectado. Ativando Martingale (Nível ${martingaleLevel.current})...`, 'ERROR');
            }
        } else {
            setWins(prev => prev + 1); 
            setConsecutiveLosses(0);
            martingaleLevel.current = 0;
            accumulatedLoss.current = 0;
            if (lastTradeDetails.current?.stake && lastTradeDetails.current.stake > (parseFloat(initialStake) || 1.00)) {
                addLog("Vitória no Gale! Banca recuperada.", "WIN");
            }
        }
        
        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }
        
        isTradeOpen.current = false; 
        setActiveContract(null); 
        setTradeStatus('IDLE'); 
        setLastCompletedContract(null);

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta de Lucro Alcançada!");
    }, [lastCompletedContract, activeContract, takeProfit, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult, addLog, initialStake, consecutiveLosses, setConsecutiveLosses, setIsPaused, setPauseTimeRemaining]);

    const selectAI = useCallback((ia: any) => {
        setSelectedAIInfo(ia);
        setActiveStrategy(ia.id);
        setAppFlow('operating');
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => {
        stopBot("Sessão Finalizada");
        setAppFlow('selection');
    }, [stopBot]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sessão Interrompida");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); 
            martingaleLevel.current = 0; accumulatedLoss.current = 0; setConsecutiveLosses(0); setIsPaused(false);
            addLog("WAVE Pro: Motor de análise estatística iniciado.", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, addLog, setConsecutiveLosses]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};