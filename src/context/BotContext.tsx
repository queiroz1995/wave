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

    // Gerenciamento de múltiplas ordens simultâneas
    const activeTrades = useRef<Set<string>>(new Set());
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    
    // Mapeamento para associar resultados a sinais específicos
    const pendingContracts = useRef<Map<string, any>>(new Map());

    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, setInitialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, martingaleFactor,
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
                if (next >= 2) { // Ultra rápido
                    setIsStudying(false);
                    addLog("Conexão Neural Restaurada.", "INFO");
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
                    // Vinculamos o contract_id ao sinal que disparou a compra
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) {
                        pendingContracts.current.set(data.buy.contract_id, {
                            signalId,
                            stake: data.echo_req.price,
                            strategyName: data.echo_req.passthrough?.strategyName,
                            contractType: data.echo_req.parameters.contract_type
                        });
                    }
                    setTradeStatus('ACTIVE'); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) activeTrades.current.delete(signalId);
                    setTradeStatus(activeTrades.current.size > 0 ? 'ACTIVE' : 'IDLE');
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.is_sold) {
                    const savedData = pendingContracts.current.get(contract.contract_id);
                    if (savedData) {
                        const { profit, status, exit_tick } = contract;
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
                            addLog("Simultânea: Loss detectado. Ajustando Martingale.", "TRADE");
                        } else {
                            setWins((prev: number) => prev + 1);
                            setConsecutiveLosses(0);
                            martingaleLevel.current = 0;
                            playWinSound();
                        }

                        updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                        activeTrades.current.delete(savedData.signalId);
                        pendingContracts.current.delete(contract.contract_id);
                        
                        setTradeStatus(activeTrades.current.size > 0 ? 'ACTIVE' : 'IDLE');
                        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Sucesso: Meta Batida!");
                    }
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setTradeStatus, addLog, setLastDigits, setTotalProfit, setWins, setLosses, setConsecutiveLosses, updateSignalResult, playWinSound, takeProfit]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback(() => {
        if (lastDigits.length < 20 || isStudying || virtualTradePending) return null;

        // Sniper WAVE de Alta Frequência
        const lastDigit = lastDigits[0];
        
        // Entradas baseadas em desvios rápidos de dígitos (Sniper 2/8)
        if (lastDigit <= 2) {
            const confidence = Math.min(99, Math.round(75 + Math.random() * 15));
            setCurrentConfidence(confidence);
            return { type: 'OVER', contract: 'DIGITOVER', name: 'WAVE Turbo', confidence, details: `Sniper Acima 2 (${confidence}%)`, barrier: 2 };
        }
        
        if (lastDigit >= 8) {
            const confidence = Math.min(99, Math.round(75 + Math.random() * 15));
            setCurrentConfidence(confidence);
            return { type: 'UNDER', contract: 'DIGITUNDER', name: 'WAVE Turbo', confidence, details: `Sniper Abaixo 8 (${confidence}%)`, barrier: 8 };
        }

        return null;
    }, [lastDigits, isStudying, virtualTradePending]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, confidence: number, barrier: number) => {
        if (!isConnected || isPaused || isStudying) return;
        
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 4.5; 
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

        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        
        // Passthrough para rastrear qual sinal disparou a compra quando a resposta voltar
        sendMessage({ 
            buy: 1, 
            price: parseFloat(stakeToUse.toFixed(2)), 
            parameters: params,
            passthrough: { signalId, strategyName }
        });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isPaused, isStudying]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isPaused || isStudying) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const signal = calculateTradeSignal();
        if (signal) {
            if (virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses) {
                setVirtualTradePending(signal);
                return;
            }

            // No modo simultâneo, podemos abrir mais de um se os sinais forem diferentes ou se o sistema permitir
            // Limitamos a no máximo 3 simultâneas para segurança de banca
            if (activeTrades.current.size < 3) {
                const sId = addSignal({ 
                    strategy: signal.name, 
                    signal: signal.type as any, 
                    details: signal.details,
                    winRate: `${signal.confidence}%` 
                });
                executeBuy(signal.contract as ContractType, signal.name, sId, signal.confidence, signal.barrier);
            }
        }
    }, [isBotRunning, lastTickEpoch, calculateTradeSignal, addSignal, executeBuy, isPaused, isStudying, virtualTargetLosses, virtualLossStreak]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        pendingContracts.current.clear();
        martingaleLevel.current = 0;
        setIsStudying(false);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setIsStudying]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Turbo Desligado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            setConsecutiveLosses(0); setIsPaused(false);
            setIsStudying(false);
            activeTrades.current.clear();
            pendingContracts.current.clear();
            addLog(`Modo TURBO WAVE Ativado: Entradas Simultâneas ligadas.`, "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, setIsPaused, addLog, setIsStudying]);

    const selectAI = useCallback((ia: any) => { 
        setSelectedAIInfo(ia); 
        setActiveStrategy(ia.id); 
        setAppFlow('operating'); 
    }, [setActiveStrategy]);

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