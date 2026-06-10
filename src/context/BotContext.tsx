"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { toast } from "sonner";

const BotContext = createContext<any>(undefined);

const SCANNER_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'R_10', label: 'Volatility 10' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_100', label: 'Volatility 100' },
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

    // Estados globais para controle de modais
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isGalePausedForFilter = useRef(false);
    const isManualSession = useRef(false); // Controla se a sessão atual foi iniciada manualmente

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, setAsset, initialStake, setInitialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, setAccountType, realToken, demoToken, accountId, setAccountId,
        loginid, setLoginid, currency, setCurrency,
        takeProfit, setTakeProfit, stopLoss, setStopLoss, martingaleFactor, setMartingaleFactor,
        maxLevels, setMaxLevels, isMartingaleActive, setIsMartingaleActive,
        isSorosActive, setIsSorosActive, sorosLevels, setSorosLevels,
        sorosProfitPercentage, setSorosProfitPercentage,
        setDuration, duration,
        setNeuralPredictions,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        isSmartModeActive, setIsSmartModeActive,
        setSignals, accountBalance, wins, losses,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    const calculateEntropy = (digits: number[]) => {
        if (digits.length < 20) return 1;
        const counts = new Array(10).fill(0);
        digits.slice(0, 50).forEach(d => counts[d]++);
        const probs = counts.map(c => c / 50).filter(p => p > 0);
        return -probs.reduce((sum, p) => sum + p * Math.log2(p), 0) / 3.32;
    };

    const getMarketState = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 50) return { confidence: 0, entropy: 1, recommendedVirtualLosses: 1, recommendedDirection: 'AGAINST', isStable: false };
        
        const evens = digits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const entropy = calculateEntropy(digits);
        const confidence = Math.floor((70 + (bias * 30)) * (1.2 - (entropy * 0.2)));
        
        let recVirtual = 1;
        if (entropy > 0.96) recVirtual = 4;
        else if (entropy > 0.92) recVirtual = 3;
        else if (entropy > 0.86) recVirtual = 2;
        else if (bias > 0.18) recVirtual = 0;
        else recVirtual = 1;

        const recDirection = bias > 0.22 ? 'FAVOR' : 'AGAINST';
        const isStable = entropy < 0.88 && bias < 0.25;

        if (symbol === asset) setCurrentConfidence(Math.min(99, confidence));
        
        return { confidence, entropy, recommendedVirtualLosses: recVirtual, recommendedDirection: recDirection, isStable };
    }, [multiAssetDigits, asset]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, count: 500, end: "latest", style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected) {
            SCANNER_ASSETS.forEach(item => {
                sendMessageRef.current({ ticks: item.value, subscribe: 1 });
                fetchDerivHistory(item.value);
            });
            // Subscribe globally to all proposal open contracts for instant updates
            sendMessageRef.current({ proposal_open_contract: 1, subscribe: 1 });
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

        const { recommendedVirtualLosses } = getMarketState(symbol);

        if (virtualTradePending && virtualTradePending.symbol === symbol) {
            let win = false;
            if (virtualTradePending.contract === 'DIGITEVEN') win = lastDigit % 2 === 0;
            else if (virtualTradePending.contract === 'DIGITODD') win = lastDigit % 2 !== 0;

            if (win) {
                setVirtualLossStreak(0);
                updateSignalResult(virtualTradePending.signalId, 'WIN', 0, 0, lastDigit);
                setAiThought(`Refração em ${symbol}. Reiniciando proteção.`);
            } else {
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                updateSignalResult(virtualTradePending.signalId, 'LOSS', 0, 0, lastDigit);
                
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                if (nextStreak >= target) {
                    setAiThought(`Proteção atingida em ${symbol}. Liberando Sniper!`);
                    if (isGalePausedForFilter.current && symbol === lastTradedAsset.current) {
                        isGalePausedForFilter.current = false;
                    }
                } else {
                    setAiThought(`Filtro Anti-Manipulação: +${target - nextStreak} Loss Virtual.`);
                }
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
    }, [asset, getMarketState, isStudying, setIsStudying, setStudyTicksCount, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, updateSignalResult]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        setAiThought("Bot Parado.");
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        martingaleLevel.current = 0;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        addLog("Resetado.", "INFO");
    }, [setTotalProfit, setWins, setLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (isBotRunning) {
            stopBot("Sniper Pausado");
        } else { 
            setIsBotRunning(true); 
            resetOperations();
            setIsStudying(true);
            setAiThought("Varrendo ativos por manipulação...");
        }
    }, [isBotRunning, stopBot, resetOperations]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Sincronizado`, color: 'bg-emerald-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                if (data.authorize?.loginid) setLoginid(data.authorize.loginid);
                if (data.authorize?.currency) setCurrency(data.authorize.currency);
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
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract) {
                    const passthrough = contract.passthrough;
                    const signalId = passthrough?.signalId;
                    if (signalId && contract.contract_id && !pendingContracts.current.has(contract.contract_id)) {
                        pendingContracts.current.set(contract.contract_id, {
                            signalId,
                            stake: contract.buy_price,
                            symbol: contract.underlying
                        });
                    }

                    if (contract.is_sold) {
                        const savedData = pendingContracts.current.get(contract.contract_id);
                        if (savedData) {
                            const isLoss = contract.status === 'lost';
                            const profitValue = parseFloat(contract.profit);
                            
                            const exitDigit = contract.exit_tick?.quote !== undefined 
                                ? parseInt(String(contract.exit_tick.quote).replace(/[^\d.]/g, '').slice(-1)) 
                                : undefined;

                            totalProfitRef.current += profitValue;
                            setTotalProfit(totalProfitRef.current);

                            if (isLoss) {
                                setLosses((prev: number) => prev + 1);
                                martingaleLevel.current += 1;
                                
                                if (martingaleLevel.current > maxLevels) {
                                    martingaleLevel.current = 0;
                                    isGalePausedForFilter.current = false;
                                    if (isManualSession.current) {
                                        isManualSession.current = false;
                                        stopBot("Limite de Martingale atingido na operação manual.");
                                    } else {
                                        addLog("Limite de Martingale atingido. Resetando para stake inicial.", "INFO");
                                    }
                                } else {
                                    const { isStable } = getMarketState(savedData.symbol);
                                    if (!isStable && !isManualSession.current) {
                                        isGalePausedForFilter.current = true;
                                        setVirtualLossStreak(0);
                                        setAiThought("Ciclo instável detectado! Pausando Gale e ativando Filtro Virtual.");
                                    } else {
                                        setAiThought("Preparando Gale imediato.");
                                    }
                                }
                            } else {
                                setWins((prev: number) => prev + 1);
                                martingaleLevel.current = 0;
                                isGalePausedForFilter.current = false;
                                setVirtualLossStreak(0);
                                setAiThought("Operação Neutralizada com Sucesso.");

                                if (isManualSession.current) {
                                    isManualSession.current = false;
                                    stopBot("Operação manual finalizada com vitória.");
                                }
                            }

                            updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                            activeTrades.current.delete(savedData.signalId);
                            pendingContracts.current.delete(contract.contract_id);
                            setTradeStatus('IDLE'); 

                            if (totalProfitRef.current >= parseFloat(takeProfit)) {
                                stopBot(`Meta batida!`);
                            } else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) {
                                stopBot(`Stop Loss atingido.`);
                            }
                        }
                    }
                }
            }
        } else if (event.type === 'auth_error') {
            setIsConnecting(false);
            setIsConnected(false);
            setLoginid(null);
            setCurrency(null);
            setAccountBalance(null);
            setStatus({ message: 'Erro de Autenticação', color: 'bg-red-500' });
        } else if (event.type === 'error') {
            setIsConnecting(false);
            setStatus({ message: 'Erro de Conexão', color: 'bg-red-500' });
        } else if (event.type === 'close') {
            setIsConnecting(false);
            setLoginid(null);
            setCurrency(null);
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, getMarketState, maxLevels]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 5) return null;

        if (isGalePausedForFilter.current && symbol === lastTradedAsset.current) return null;

        const { recommendedDirection } = getMarketState(symbol);
        const direction = isSmartModeActive ? recommendedDirection : entryDirection;

        if (martingaleLevel.current > 0 && lastTradedAsset.current === symbol) {
            const contract = lastContractType.current || 'DIGITEVEN';
            return { type: contract === 'DIGITEVEN' ? 'EVEN' : 'ODD', contract, name: 'Recovery (Gale)', confidence: 99, symbol };
        }

        let currentStreak = 1;
        const firstParity = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
            else break;
        }

        if (currentStreak >= consecutiveTarget) {
            const targetType = direction === 'AGAINST' ? (firstParity ? 'ODD' : 'EVEN') : (firstParity ? 'EVEN' : 'ODD');
            return { 
                type: targetType, 
                contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                name: 'WAVE', 
                confidence: 85 + (currentStreak * 2), 
                symbol 
            };
        }
        return null;
    }, [multiAssetDigits, consecutiveTarget, entryDirection, isStudying, isSmartModeActive, getMarketState]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, customStake?: number) => {
        const baseStake = customStake !== undefined ? customStake : (parseFloat(initialStake) || 0.35);
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;

        if (!isConnected) {
            // MODO SIMULAÇÃO
            lastContractType.current = contractType;
            lastTradedAsset.current = symbol;
            activeTrades.current.add(signalId);
            setTradeStatus('ACTIVE');

            // Simula o resultado após 1.5 segundos (1 tick)
            setTimeout(() => {
                if (!activeTrades.current.has(signalId)) return;

                const isWin = Math.random() > 0.45; // 55% de taxa de vitória simulada
                const profitValue = isWin ? stakeToUse * 0.95 : -stakeToUse;
                const exitDigit = Math.floor(Math.random() * 10);

                totalProfitRef.current += profitValue;
                setTotalProfit(totalProfitRef.current);

                if (!isWin) {
                    setLosses((prev: number) => prev + 1);
                    martingaleLevel.current += 1;
                    
                    if (martingaleLevel.current > maxLevels) {
                        martingaleLevel.current = 0;
                        isGalePausedForFilter.current = false;
                        if (isManualSession.current) {
                            isManualSession.current = false;
                            stopBot("Limite de Martingale atingido na operação manual.");
                        } else {
                            addLog("Limite de Martingale atingido. Resetando para stake inicial.", "INFO");
                        }
                    } else {
                        const { isStable } = getMarketState(symbol);
                        if (!isStable && !isManualSession.current) {
                            isGalePausedForFilter.current = true;
                            setVirtualLossStreak(0);
                            setAiThought("Ciclo instável detectado! Pausando Gale e ativando Filtro Virtual.");
                        } else {
                            setAiThought("Preparando Gale imediato.");
                        }
                    }
                } else {
                    setWins((prev: number) => prev + 1);
                    martingaleLevel.current = 0;
                    isGalePausedForFilter.current = false;
                    setVirtualLossStreak(0);
                    setAiThought("Operação Neutralizada com Sucesso.");

                    if (isManualSession.current) {
                        isManualSession.current = false;
                        stopBot("Operação manual finalizada com vitória.");
                    }
                }

                updateSignalResult(signalId, isWin ? 'WIN' : 'LOSS', profitValue, stakeToUse, exitDigit);
                activeTrades.current.delete(signalId);
                setTradeStatus('IDLE');

                if (totalProfitRef.current >= parseFloat(takeProfit)) {
                    stopBot(`Meta batida!`);
                } else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) {
                    stopBot(`Stop Loss atingido.`);
                }
            }, 1500);

            return;
        }

        // Modo Real/Demo conectado
        if (isStudying || activeTrades.current.size > 0) return;
        const params = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol };
        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying, maxLevels, isManualSession, stopBot, addLog, getMarketState, updateSignalResult, takeProfit, stopLoss]);

    // Simulação de Ticks quando o bot está rodando sem conexão
    useEffect(() => {
        if (!isBotRunning || isConnected) return;

        const interval = setInterval(() => {
            const randomDigit = Math.floor(Math.random() * 10);
            const mockTick = {
                quote: (100 + Math.random() * 10).toFixed(2) + randomDigit,
                epoch: Math.floor(Date.now() / 1000),
                symbol: asset
            };
            processTickData(mockTick);
        }, 1500);

        return () => clearInterval(interval);
    }, [isBotRunning, isConnected, asset, processTickData]);

    // Função para compra manual (usada por botões)
    const manualBuy = useCallback((contractType: ContractType, source: string = 'Manual', customStake?: number) => {
        isManualSession.current = true;
        if (!isBotRunning) {
            setIsBotRunning(true);
            setIsStudying(false); // Ignora o estudo inicial para entrada manual imediata
            setAiThought("Entrada manual detectada. Monitorando recuperação inteligente...");
        }

        const sId = addSignal({ 
            strategy: source, 
            signal: contractType === 'DIGITEVEN' ? 'EVEN' : 'ODD', 
            details: `Entrada manual via ${source}`, 
            winRate: '100%' 
        });
        executeBuy(contractType, source, sId, asset, customStake);
    }, [isBotRunning, setIsBotRunning, setIsStudying, setAiThought, addSignal, executeBuy, asset]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS.map(a => a.value)) {
            const signal = calculateTradeSignal(symbol);
            if (signal) {
                const { recommendedVirtualLosses } = getMarketState(symbol);
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                const isRecovery = signal.name.includes('Recovery');
                const needsVirtual = !isManualSession.current && target > 0 && virtualLossStreak < target;
                
                if (needsVirtual) {
                    if (!virtualTradePending) {
                        const sId = addSignal({ 
                            strategy: isRecovery ? `VIRTUAL (RECOVERY FILTER)` : `VIRTUAL (IA: ${target}L)`, 
                            signal: signal.type as any, 
                            details: isRecovery ? `Limpando ciclo para Gale seguro` : `Filtro dinâmico em ${symbol}`, 
                            winRate: `${signal.confidence}%` 
                        });
                        setVirtualTradePending({ ...signal, signalId: sId, symbol });
                    }
                    break;
                }
                
                if (activeTrades.current.size === 0) {
                    const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: `Sniper Real em ${symbol}`, winRate: `${signal.confidence}%` });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, getMarketState]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            setIsConnecting(true);
            if (isConnected) { 
                disconnect(); 
                setTimeout(() => {
                    connect(token, type, accountId);
                }, 600);
            }
            else connect(token, type, accountId);
        }
    }, [accountType, realToken, demoToken, accountId, connect, disconnect, isConnected]);

    const selectAI = useCallback((ia: any) => { 
        setSelectedAIInfo(ia); 
        setActiveStrategy(ia.id); 
        setAppFlow('operating'); 
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => { 
        stopBot("Sessão Finalizada"); 
        setAppFlow('selection'); 
    }, [stopBot]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought,
        manualBuy, isSettingsOpen, setIsSettingsOpen, isConfigModalOpen, setIsConfigModalOpen
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};
