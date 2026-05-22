"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';

const BotContext = createContext<any>(undefined);

const WIN_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";

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
    const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ 
        stake: number, 
        strategyName: string, 
        signalId: string | null, 
        contractType: ContractType | null, 
        patternName: string, 
        confidence: number,
        barrier: number
    } | null>(null);
    
    const lastLossContractType = useRef<ContractType | null>(null);

    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, setInitialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, martingaleFactor, digitPrediction, setDigitPrediction,
        consecutiveLosses, setConsecutiveLosses, isPaused, setIsPaused,
        neuralPredictions, setNeuralPredictions,
        isStudying, setIsStudying, studyTicksCount, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        isSoundEnabled
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(WIN_SOUND_URL);
    }, []);

    const playWinSound = useCallback(() => {
        if (isSoundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => console.warn("Erro ao tocar som:", err));
        }
    }, [isSoundEnabled]);

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

    const [virtualTradePending, setVirtualTradePending] = useState<any>(null);

    const processTickData = useCallback((tick: { quote: string, epoch: number }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
        setLastDigits((prev: number[]) => {
            const newList = [lastDigit, ...prev].slice(0, 500);
            
            if (virtualTradePending) {
                const barrier = virtualTradePending.barrier;
                let win = false;
                if (virtualTradePending.contract === 'DIGITOVER') win = lastDigit > barrier;
                else if (virtualTradePending.contract === 'DIGITUNDER') win = lastDigit < barrier;
                
                if (win) {
                    setVirtualLossStreak(0);
                    addLog(`Proteção Virtual: Win simulado (Dígito ${lastDigit})`, "INFO");
                } else {
                    const newStreak = virtualLossStreak + 1;
                    setVirtualLossStreak(newStreak);
                    addLog(`Loss Virtual: ${newStreak}/${virtualTargetLosses}`, "INFO");
                }
                setVirtualTradePending(null);
            }

            return newList;
        });

        setLastTickEpoch(tick.epoch);
        updateNeuralPredictions();

        if (isStudying) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 4) { // Menos ticks para ser mais rápido
                    setIsStudying(false);
                    addLog("Fluxo Validado. Retomando operações rápidas.", "INFO");
                    return 0;
                }
                return next;
            });
        }
    }, [setLastDigits, setLastTickEpoch, updateNeuralPredictions, isStudying, setIsStudying, setStudyTicksCount, addLog, virtualTradePending, virtualLossStreak, virtualTargetLosses, setVirtualLossStreak]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Sniper Ativo`, color: 'bg-green-500' });
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
                    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
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

    const calculateTradeSignal = useCallback(() => {
        if (lastDigits.length < 25 || isStudying || virtualTradePending) return null;

        // Análise de Fluxo (Over/Under)
        const last5 = lastDigits.slice(0, 5);
        const lowDigitsCount = last5.filter(d => d <= 4).length;
        const highDigitsCount = 5 - lowDigitsCount;

        const overNeural = neuralPredictions.filter((p, i) => i > 4).reduce((a, b) => a + b, 0);
        const underNeural = neuralPredictions.filter((p, i) => i < 5).reduce((a, b) => a + b, 0);

        // Se houver muitos dígitos baixos e a rede neural concorda com subida
        if (lowDigitsCount >= 4 && overNeural > 55) {
            const confidence = Math.min(99, Math.round(overNeural));
            setCurrentConfidence(confidence);
            return { type: 'OVER', contract: 'DIGITOVER', name: 'WAVE Acima', confidence, details: `Sinal: Acima de 4 (${confidence}%)`, barrier: 4 };
        }
        
        // Se houver muitos dígitos altos e a rede neural concorda com descida
        if (highDigitsCount >= 4 && underNeural > 55) {
            const confidence = Math.min(99, Math.round(underNeural));
            setCurrentConfidence(confidence);
            return { type: 'UNDER', contract: 'DIGITUNDER', name: 'WAVE Abaixo', confidence, details: `Sinal: Abaixo de 5 (${confidence}%)`, barrier: 5 };
        }

        return null;
    }, [lastDigits, neuralPredictions, isStudying, virtualTradePending]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, patternName: string, confidence: number, barrier: number) => {
        if (!isConnected || isTradeOpen.current || isPaused || isStudying) return;
        
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1;
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        
        const params: any = { 
            amount: parseFloat(stakeToUse.toFixed(2)), 
            basis: 'stake', 
            contract_type: contractType, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol: asset,
            barrier: barrier
        };

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, patternName, confidence, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = setTimeout(() => {
            if (isTradeOpen.current) {
                isTradeOpen.current = false;
                setTradeStatus('IDLE');
                addLog("Recuperação de Fluxo Ativada.", "ERROR");
            }
        }, 8000);

        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused, isStudying, addLog]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current || isPaused || isStudying) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const signal = calculateTradeSignal();
        if (signal) {
            if (virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses) {
                setVirtualTradePending(signal);
                return;
            }

            const sId = addSignal({ 
                strategy: signal.name, 
                signal: signal.type as any, 
                details: signal.details,
                winRate: `${signal.confidence}%` 
            });
            executeBuy(signal.contract as ContractType, signal.name, sId, signal.name, signal.confidence, signal.barrier);
        }
    }, [isBotRunning, lastTickEpoch, calculateTradeSignal, addSignal, executeBuy, isPaused, isStudying, virtualTargetLosses, virtualLossStreak]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, exit_tick } = lastCompletedContract;
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const profitValue = parseFloat(profit);

        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

        setAccountBalance((prev: number) => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses((prev: number) => prev + 1);
            setConsecutiveLosses((p: number) => p + 1);
            martingaleLevel.current += 1;
            lastLossContractType.current = lastTradeDetails.current?.contractType || null;
            setIsStudying(true);
            setStudyTicksCount(0);
            addLog("Resultado: Perda. Iniciando motor de recuperação rápida.", "TRADE");
        } else {
            setWins((prev: number) => prev + 1);
            setConsecutiveLosses(0);
            martingaleLevel.current = 0;
            lastLossContractType.current = null;
            playWinSound();
        }

        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }

        isTradeOpen.current = false;
        setTradeStatus('IDLE');
        setLastCompletedContract(null);
        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Sucesso: Meta Alcançada!");
    }, [lastCompletedContract, takeProfit, setTotalProfit, setWins, setLosses, setAccountBalance, setTradeStatus, updateSignalResult, addLog, setIsStudying, setStudyTicksCount, playWinSound]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        setIsStudying(false);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        lastLossContractType.current = null;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setIsStudying]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Robô Pausado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            setConsecutiveLosses(0); setIsPaused(false);
            setIsStudying(false);
            lastLossContractType.current = null;
            addLog(`Ativando I.A Acima/Abaixo: Recuperação Inteligente ligada.`, "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, setIsPaused, addLog, setIsStudying]);

    const selectAI = useCallback((ia: any) => { 
        setSelectedAIInfo(ia); 
        setActiveStrategy(ia.id); 
        setInitialStake('0.35');
        setAppFlow('operating'); 
    }, [setActiveStrategy, setInitialStake]);

    const exitToSelection = useCallback(() => { stopBot("Sessão Finalizada"); setAppFlow('selection'); }, [stopBot]);
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};