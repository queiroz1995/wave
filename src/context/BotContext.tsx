"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';

const BotContext = createContext<any>(undefined);

const SCANNER_ASSETS = [
    '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100'
];

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
    const [aiThought, setAiThought] = useState("Sincronizando I.A...");
    const [isConnecting, setIsConnecting] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isGalePausedForFilter = useRef(false);

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning, setActiveStrategy, activeStrategy,
        accountType, realToken, demoToken,
        takeProfit, stopLoss, martingaleFactor,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, isSmartModeActive, setSignals
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    // Watchdog para evitar travamentos
    useEffect(() => {
        const interval = setInterval(() => {
            if (isBotRunning && activeTrades.current.size > 0) {
                setAiThought("Watchdog: Verificando integridade dos sinais...");
                setTradeStatus('IDLE');
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [isBotRunning, setTradeStatus]);

    const calculateEntropy = (digits: number[]) => {
        if (digits.length < 20) return 1;
        const counts = new Array(10).fill(0);
        digits.slice(0, 50).forEach(d => counts[d]++);
        const probs = counts.map(c => c / 50).filter(p => p > 0);
        return -probs.reduce((sum, p) => sum + p * Math.log2(p), 0) / 3.32;
    };

    const getMarketState = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 50) return { confidence: 0, entropy: 1, topDigits: [], evensPercentage: 50, coldDigits: [] };
        
        const counts = new Array(10).fill(0);
        digits.slice(0, 100).forEach(d => counts[d]++);
        
        const digitStats = counts.map((count, digit) => ({ digit, count }));
        const topDigits = [...digitStats].sort((a, b) => b.count - a.count).slice(0, 3).map(d => d.digit);
        const coldDigits = [...digitStats].sort((a, b) => a.count - b.count).slice(0, 3).map(d => d.digit);

        const evensCount = digits.slice(0, 100).filter(d => d % 2 === 0).length;
        const entropy = calculateEntropy(digits);
        const bias = Math.abs(50 - evensCount) / 100;
        const confidence = Math.floor((75 + (bias * 50)) * (1.1 - (entropy * 0.1)));
        
        if (symbol === asset) setCurrentConfidence(Math.min(99, confidence));
        
        return { confidence, entropy, topDigits, coldDigits, evensPercentage: evensCount };
    }, [multiAssetDigits, asset]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, count: 500, end: "latest", style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected) {
            SCANNER_ASSETS.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                fetchDerivHistory(symbol);
            });
        }
    }, [isConnected, fetchDerivHistory]);

    const [virtualTradePending, setVirtualTradePending] = useState<any>(null);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
        setMultiAssetDigits((prev: Record<string, number[]>) => {
            const currentHistory = prev[symbol] || [];
            const newHistory = [lastDigit, ...currentHistory].slice(0, 500);
            if (symbol === asset) {
                setLastDigits(newHistory);
                setLastTickEpoch(tick.epoch);
            }
            return { ...prev, [symbol]: newHistory };
        });

        if (virtualTradePending && virtualTradePending.symbol === symbol) {
            let win = false;
            if (virtualTradePending.contract === 'DIGITEVEN') win = lastDigit % 2 === 0;
            else if (virtualTradePending.contract === 'DIGITODD') win = lastDigit % 2 !== 0;
            else if (virtualTradePending.contract === 'DIGITOVER') win = lastDigit > virtualTradePending.barrier;
            else if (virtualTradePending.contract === 'DIGITUNDER') win = lastDigit < virtualTradePending.barrier;

            if (win) {
                setVirtualLossStreak(0);
                updateSignalResult(virtualTradePending.signalId, 'WIN', 0, 0, lastDigit);
            } else {
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                updateSignalResult(virtualTradePending.signalId, 'LOSS', 0, 0, lastDigit);
            }
            setVirtualTradePending(null);
        }

        if (isStudying && symbol === asset) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 5) {
                    setIsStudying(false);
                    return 0;
                }
                return next;
            });
        }
    }, [asset, isStudying, setIsStudying, setStudyTicksCount, virtualTradePending, virtualLossStreak, updateSignalResult, setLastDigits, setLastTickEpoch, setMultiAssetDigits]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        setAiThought(`Sessão Encerrada.`);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
    }, [setTotalProfit, setWins, setLosses, setSignals, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sniper Parado");
        else { 
            setIsBotRunning(true); 
            resetOperations();
            setIsStudying(true);
            setAiThought("Analisando micro-tendências...");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Sincronizado`, color: 'bg-green-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) setAccountBalance(parseFloat(data.balance.balance));
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) {
                        pendingContracts.current.set(data.buy.contract_id, {
                            signalId,
                            stake: data.echo_req.price,
                            symbol: data.echo_req.parameters.symbol
                        });
                    }
                    setTradeStatus('ACTIVE'); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.is_sold) {
                    const savedData = pendingContracts.current.get(contract.contract_id);
                    if (savedData) {
                        const isLoss = contract.status === 'lost';
                        const profitValue = parseFloat(contract.profit);
                        const exitDigit = contract.exit_tick ? parseInt(String(contract.exit_tick).slice(-1)) : undefined;

                        totalProfitRef.current += profitValue;
                        setTotalProfit(totalProfitRef.current);

                        if (isLoss) {
                            setLosses((prev: number) => prev + 1);
                            martingaleLevel.current += 1;
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            setAiThought("Alvo neutralizado com lucro.");
                        }

                        updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                        activeTrades.current.delete(savedData.signalId);
                        pendingContracts.current.delete(contract.contract_id);
                        setTradeStatus('IDLE'); 

                        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot(`Meta batida!`);
                        else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) stopBot(`Stop Loss.`);
                    }
                }
            }
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, barrier?: number) => {
        if (!isConnected || isStudying || activeTrades.current.size > 0) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        
        let stakeToUse = baseStake;
        if (martingaleLevel.current > 0) {
            const mgFactor = parseFloat(martingaleFactor) || 2.1;
            stakeToUse = baseStake * Math.pow(mgFactor, martingaleLevel.current);
        }
        
        const params: any = { 
            amount: parseFloat(stakeToUse.toFixed(2)), 
            basis: 'stake', 
            contract_type: contractType, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol 
        };
        
        if (barrier !== undefined) params.barrier = barrier;

        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying]);

    const calculateTradeSignals = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 10) return [];

        const { coldDigits, evensPercentage, entropy } = getMarketState(symbol);

        // Lógica Inteligente Neural Sniper (Substituindo o Digit Match arriscado)
        if (activeStrategy === 'frequencySniper') {
            // Caso 1: Estabilidade para Over 2 (Dígitos baixos sumiram)
            const lowDigitsCold = coldDigits.filter(d => d <= 2).length >= 2;
            if (lowDigitsCold && entropy < 0.92) {
                if (symbol === asset) setAiThought("Detectada zona fria (0-2). Atacando Over 2.");
                return [{ type: 'OVER', contract: 'DIGITOVER', barrier: 2, name: 'Neural: Over 2', confidence: 88, symbol }];
            }

            // Caso 2: Estabilidade para Under 7 (Dígitos altos sumiram)
            const highDigitsCold = coldDigits.filter(d => d >= 7).length >= 2;
            if (highDigitsCold && entropy < 0.92) {
                if (symbol === asset) setAiThought("Detectada zona fria (7-9). Atacando Under 7.");
                return [{ type: 'UNDER', contract: 'DIGITUNDER', barrier: 7, name: 'Neural: Under 7', confidence: 88, symbol }];
            }

            // Caso 3: Desequilíbrio de Paridade (Entrada de Reversão Inteligente)
            if (evensPercentage > 62) {
                if (symbol === asset) setAiThought("Saturação de Pares. Snipando Ímpar.");
                return [{ type: 'ODD', contract: 'DIGITODD', name: 'Neural: Reversão Ímpar', confidence: 82, symbol }];
            } else if (evensPercentage < 38) {
                if (symbol === asset) setAiThought("Saturação de Ímpares. Snipando Par.");
                return [{ type: 'EVEN', contract: 'DIGITEVEN', name: 'Neural: Reversão Par', confidence: 82, symbol }];
            }
        }

        // WAVE original
        if (activeStrategy === 'trendSurfer') {
            let currentStreak = 1;
            const firstParity = digits[0] % 2 === 0;
            for (let i = 1; i < digits.length; i++) {
                if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
                else break;
            }

            if (currentStreak >= consecutiveTarget) {
                const targetType = firstParity ? 'ODD' : 'EVEN';
                return [{ type: targetType, contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', name: 'WAVE: Against', confidence: 85, symbol }];
            }
        }
        
        return [];
    }, [multiAssetDigits, isStudying, getMarketState, activeStrategy, asset, consecutiveTarget]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS) {
            const signalsFound = calculateTradeSignals(symbol);
            if (signalsFound.length > 0) {
                if (activeTrades.current.size === 0) {
                    const signal = signalsFound[0];
                    const sId = addSignal({ 
                        strategy: signal.name, 
                        signal: signal.type as any, 
                        details: `Neural Core Synced: ${symbol}`, 
                        winRate: `${signal.confidence}%` 
                    });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol, (signal as any).barrier);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignals, addSignal, executeBuy, isStudying]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating'); }, [setActiveStrategy]);
    const exitToSelection = useCallback(() => { stopBot("Sessão Finalizada"); setAppFlow('selection'); }, [stopBot]);
    
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            setIsConnecting(true);
            if (isConnected) { disconnect(); connect(token, type); }
            else connect(token, type);
        }
    }, [accountType, realToken, demoToken, connect, disconnect, isConnected]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};