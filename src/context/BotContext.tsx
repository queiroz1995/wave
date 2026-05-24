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

    const activeTrades = useRef<Set<string>>(new Set());
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    
    const winsRef = useRef(0);
    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, setInitialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, setAccountType, realToken, demoToken,
        takeProfit, stopLoss, martingaleFactor,
        consecutiveLosses, setConsecutiveLosses,
        neuralPredictions, setNeuralPredictions,
        isStudying, setIsStudying, studyTicksCount, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        isSoundEnabled,
        consecutiveTarget, entryDirection,
        isSmartModeActive,
        setSignals
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
        const evens = lastDigits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const confidence = Math.floor(75 + (bias * 25));
        setCurrentConfidence(confidence);

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
                const isEven = lastDigit % 2 === 0;
                const win = virtualTradePending.type === 'EVEN' ? isEven : !isEven;
                const baseStake = parseFloat(initialStake) || 0.35;
                
                if (win) {
                    setVirtualLossStreak(0);
                    playWinSound();
                    addLog(`Vitória Virtual (Dígito ${lastDigit}). Resetando contador.`, "INFO");
                    updateSignalResult(virtualTradePending.signalId, 'WIN', baseStake * 0.95, baseStake, lastDigit);
                } else {
                    const nextStreak = virtualLossStreak + 1;
                    setVirtualLossStreak(nextStreak);
                    addLog(`Loss Virtual: ${nextStreak}/${virtualTargetLosses} (Dígito ${lastDigit})`, "INFO");
                    updateSignalResult(virtualTradePending.signalId, 'LOSS', -baseStake, baseStake, lastDigit);
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
                if (next >= 5) {
                    setIsStudying(false);
                    addLog("Sincronização Neural Completa. Iniciando Monitoramento.", "INFO");
                    return 0;
                }
                return next;
            });
        }
    }, [setLastDigits, setLastTickEpoch, updateNeuralPredictions, isStudying, setIsStudying, setStudyTicksCount, addLog, virtualTradePending, virtualLossStreak, virtualTargetLosses, setVirtualLossStreak, playWinSound, updateSignalResult, initialStake]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        pendingContracts.current.clear();
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setIsStudying(false);
        setTradeStatus('IDLE');
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setIsStudying, setVirtualLossStreak, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        winsRef.current = 0;
        setConsecutiveLosses(0);
        setSignals([]);
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        activeTrades.current.clear();
        pendingContracts.current.clear();
        setTradeStatus('IDLE');
        addLog("Operações resetadas pelo usuário.", "INFO");
    }, [setTotalProfit, setWins, setLosses, setConsecutiveLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sniper Parado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            winsRef.current = 0;
            setConsecutiveLosses(0);
            setVirtualLossStreak(0);
            setVirtualTradePending(null);
            setIsStudying(true);
            setStudyTicksCount(0);
            activeTrades.current.clear();
            pendingContracts.current.clear();
            martingaleLevel.current = 0;
            setTradeStatus('IDLE');
            addLog(`Iniciando Sniper em Conta ${accountType.toUpperCase()}.`, "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, addLog, setIsStudying, setStudyTicksCount, accountType, setVirtualLossStreak, setTradeStatus]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Sniper Ativo`, color: 'bg-green-500' });
                if (data.authorize?.balance !== undefined) {
                    setAccountBalance(parseFloat(data.authorize.balance));
                }
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) {
                    setAccountBalance(parseFloat(data.balance.balance));
                }
            } else if (data?.msg_type === 'history') {
                if (data.history?.prices) {
                    const digits = data.history.prices.map((p: number) => parseInt(String(p).slice(-1)));
                    setLastDigits(digits.reverse());
                }
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
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
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.is_sold || contract?.status === 'won' || contract?.status === 'lost') {
                    const savedData = pendingContracts.current.get(contract.contract_id);
                    if (savedData) {
                        const { profit, status, exit_tick } = contract;
                        const isLoss = status === 'lost';
                        const exitDigit = exit_tick ? parseInt(String(exit_tick).slice(-1)) : undefined;
                        const profitValue = parseFloat(profit);

                        setAccountBalance((prev: number | null) => prev !== null ? Number((prev + profitValue).toFixed(2)) : null);
                        totalProfitRef.current += profitValue;
                        setTotalProfit(totalProfitRef.current);

                        if (isLoss) {
                            setLosses((prev: number) => prev + 1);
                            setConsecutiveLosses((p: number) => p + 1);
                            martingaleLevel.current += 1;
                            
                            if (consecutiveLosses + 1 === 2) {
                                addLog("Trava de Segurança: 2 Losses detectados. Retornando ao Filtro Virtual para o 3º Gale.", "INFO");
                                setVirtualLossStreak(0);
                            }
                        } else {
                            winsRef.current += 1;
                            setWins(winsRef.current);
                            setConsecutiveLosses(0);
                            martingaleLevel.current = 0;
                            playWinSound();
                        }

                        updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                        activeTrades.current.delete(savedData.signalId);
                        pendingContracts.current.delete(contract.contract_id);
                        setTradeStatus('IDLE'); 
                        sendMessageRef.current({ balance: 1 });

                        const tp = parseFloat(takeProfit);
                        const sl = Math.abs(parseFloat(stopLoss));
                        if (totalProfitRef.current >= tp) stopBot(`META ALCANÇADA: +$${totalProfitRef.current.toFixed(2)}`);
                        else if (totalProfitRef.current <= -sl) stopBot(`STOP LOSS ATINGIDO: -$${Math.abs(totalProfitRef.current).toFixed(2)}`);
                    }
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setTradeStatus, addLog, setLastDigits, setTotalProfit, setWins, setLosses, setConsecutiveLosses, updateSignalResult, playWinSound, takeProfit, stopLoss, stopBot, setVirtualLossStreak, consecutiveLosses]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback(() => {
        if (activeTrades.current.size > 0 || isStudying || lastDigits.length < 10) return null;

        if (martingaleLevel.current > 0) {
            const contract = lastContractType.current || 'DIGITEVEN';
            return { type: contract === 'DIGITEVEN' ? 'EVEN' : 'ODD', contract, name: 'Recuperação Sniper', confidence: 100, details: `Gale Nível ${martingaleLevel.current}` };
        }

        let currentStreak = 1;
        const firstParity = lastDigits[0] % 2 === 0;
        for (let i = 1; i < lastDigits.length; i++) {
            if ((lastDigits[i] % 2 === 0) === firstParity) currentStreak++;
            else break;
        }
        if (currentStreak > 4) return null;

        const last4 = lastDigits.slice(0, 4);
        const isAlternating = (last4[0] % 2 !== last4[1] % 2) && (last4[1] % 2 !== last4[2] % 2) && (last4[2] % 2 !== last4[3] % 2);

        if (isAlternating) {
            const nextType = last4[0] % 2 === 0 ? 'ODD' : 'EVEN';
            return { 
                type: nextType, 
                contract: nextType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                name: 'Vortex Alternation', 
                confidence: currentConfidence, 
                details: 'Padrão Zigue-Zague Detectado' 
            };
        }

        if (currentStreak === consecutiveTarget) {
            const streakParity = firstParity ? 'EVEN' : 'ODD';
            let targetType: 'EVEN' | 'ODD';
            if (entryDirection === 'AGAINST') targetType = streakParity === 'EVEN' ? 'ODD' : 'EVEN';
            else targetType = streakParity === 'EVEN' ? 'EVEN' : 'ODD';
            
            return { 
                type: targetType, 
                contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                name: isSmartModeActive ? 'SMART NEURAL' : 'WAVE Sniper', 
                confidence: currentConfidence, 
                details: `${entryDirection === 'AGAINST' ? 'Reversão' : 'Tendência'} ${currentStreak}x` 
            };
        }

        return null;
    }, [lastDigits, consecutiveTarget, entryDirection, isStudying, currentConfidence, isSmartModeActive]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, confidence: number) => {
        if (!isConnected || isStudying || activeTrades.current.size > 0) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        const params: any = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        lastContractType.current = contractType;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        addLog(`Executando entrada REAL em CONTA ${accountType.toUpperCase()} ($${stakeToUse.toFixed(2)})`, "INFO");
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });

        // Trava de segurança: se não houver resposta em 15s, limpa o estado
        setTimeout(() => {
            if (activeTrades.current.has(signalId)) {
                activeTrades.current.delete(signalId);
                setTradeStatus('IDLE');
                addLog("Timeout de operação detectado. Destravando sistema.", "ERROR");
            }
        }, 15000);
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, martingaleFactor, isStudying, accountType, addLog]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isStudying) return;
        processedTickEpoch.current = lastTickEpoch;
        const signal = calculateTradeSignal();
        if (signal) {
            const shouldWaitVirtual = virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses && (martingaleLevel.current === 0 || consecutiveLosses === 2);
            
            if (shouldWaitVirtual) {
                if (!virtualTradePending) {
                    const sId = addSignal({ strategy: `VIRTUAL: ${signal.name}`, signal: signal.type as any, details: `Simulação ${virtualLossStreak + 1}/${virtualTargetLosses}`, winRate: `${signal.confidence}%` });
                    setVirtualTradePending({ ...signal, signalId: sId });
                }
                return;
            }
            
            if (activeTrades.current.size === 0) {
                const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: signal.details, winRate: `${signal.confidence}%` });
                executeBuy(signal.contract as ContractType, signal.name, sId, signal.confidence);
            }
        }
    }, [isBotRunning, lastTickEpoch, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTargetLosses, virtualLossStreak, virtualTradePending, consecutiveLosses]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating'); }, [setActiveStrategy]);
    const exitToSelection = useCallback(() => { stopBot("Sessão Finalizada"); setAppFlow('selection'); }, [stopBot]);
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            if (isConnected) { disconnect(); connect(token, type); }
            else connect(token, type);
        }
    }, [accountType, realToken, demoToken, connect, disconnect, isConnected]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};