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

const SEARCHING_MESSAGES = [
    "Escaneando Volatilidade 10s...",
    "Analisando fluxo 25s...",
    "Mapeando padrões 50s...",
    "Sincronizando 75s...",
    "Monitorando 100s...",
    "Vigiando Volatility 10 Index...",
    "Vigiando Volatility 50 Index...",
    "Aguardando confirmação neural...",
    "Calculando probabilidades..."
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
    const [aiThought, setAiThought] = useState("Aguardando comando...");
    const [isConnecting, setIsConnecting] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const processedTickEpoch = useRef<Record<string, number>>({});
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    const lastPrices = useRef<Record<string, number>>({});
    
    const winsRef = useRef(0);
    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, stopLoss, martingaleFactor,
        consecutiveLosses, setConsecutiveLosses,
        setNeuralPredictions,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses,
        consecutiveTarget, entryDirection,
        isSmartModeActive,
        digitTradeMode,
        setSignals
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    const updateNeuralPredictions = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 50) return;
        
        const evens = digits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const confidence = Math.floor(75 + (bias * 25));
        
        if (symbol === asset) {
            setCurrentConfidence(confidence);
            const matrix = Array.from({ length: 10 }, () => new Array(10).fill(0));
            const reversed = [...digits].reverse();
            for (let i = 0; i < reversed.length - 1; i++) matrix[reversed[i]][reversed[i+1]]++;
            const lastDigit = digits[0];
            const transitions = matrix[lastDigit];
            const total = transitions.reduce((a, b) => a + b, 0);
            if (total > 0) setNeuralPredictions(transitions.map(t => (t / total) * 100));
        }
    }, [multiAssetDigits, asset, setNeuralPredictions]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, adjust_start_time: 1, count: 500, end: "latest", start: 1, style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected) {
            sendMessageRef.current({ forget_all: 'ticks' });
            SCANNER_ASSETS.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                fetchDerivHistory(symbol);
            });
        }
    }, [isConnected, fetchDerivHistory]);

    const [virtualTradePending, setVirtualTradePending] = useState<any>(null);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
        const prevPrice = lastPrices.current[symbol];
        const direction = prevPrice ? (price > prevPrice ? 'UP' : price < prevPrice ? 'DOWN' : 'STABLE') : 'STABLE';
        lastPrices.current[symbol] = price;

        setMultiAssetDigits((prev: Record<string, number[]>) => {
            const currentHistory = prev[symbol] || [];
            const newHistory = [lastDigit, ...currentHistory].slice(0, 500);
            
            if (symbol === asset) {
                setLastDigits(newHistory);
                setLastTickEpoch(tick.epoch);
            }

            return { ...prev, [symbol]: newHistory };
        });

        updateNeuralPredictions(symbol);

        if (virtualTradePending && virtualTradePending.symbol === symbol) {
            let win = false;
            if (virtualTradePending.contract === 'DIGITEVEN') win = lastDigit % 2 === 0;
            else if (virtualTradePending.contract === 'DIGITODD') win = lastDigit % 2 !== 0;
            else if (virtualTradePending.contract === 'CALL') win = direction === 'UP';
            else if (virtualTradePending.contract === 'PUT') win = direction === 'DOWN';

            const baseStake = parseFloat(initialStake) || 0.35;
            
            if (win) {
                setVirtualLossStreak(0);
                addLog(`Vitória Virtual em ${symbol}. Resetando.`, "INFO");
                updateSignalResult(virtualTradePending.signalId, 'WIN', baseStake * 0.95, baseStake, lastDigit);
            } else {
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                addLog(`Loss Virtual em ${symbol}: ${nextStreak}/${virtualTargetLosses}`, "INFO");
                updateSignalResult(virtualTradePending.signalId, 'LOSS', -baseStake, baseStake, lastDigit);
            }
            setVirtualTradePending(null);
        }

        if (isStudying && symbol === asset) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 5) {
                    setIsStudying(false);
                    addLog("Scanner Multi-Ativos Sincronizado.", "INFO");
                    setAiThought("Monitorando 10 mercados simultâneos...");
                    return 0;
                }
                return next;
            });
        } else if (isBotRunning && !virtualTradePending) {
            if (Math.random() > 0.95) {
                setAiThought(SEARCHING_MESSAGES[Math.floor(Math.random() * SEARCHING_MESSAGES.length)]);
            }
        }
    }, [asset, setLastDigits, setLastTickEpoch, updateNeuralPredictions, isStudying, setIsStudying, setStudyTicksCount, addLog, virtualTradePending, virtualLossStreak, virtualTargetLosses, setVirtualLossStreak, updateSignalResult, initialStake, isBotRunning]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        pendingContracts.current.clear();
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setIsStudying(false);
        setTradeStatus('IDLE');
        setAiThought("Sistema em Standby.");
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
        setAiThought("Operações resetadas.");
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
            setAiThought("Iniciando Scanner Multi-Ativos...");
            addLog(`Iniciando Scanner em Conta ${accountType.toUpperCase()}.`, "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, setConsecutiveLosses, addLog, setIsStudying, setStudyTicksCount, accountType, setVirtualLossStreak, setTradeStatus]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
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
                    const symbol = data.echo_req.ticks_history;
                    const digits = data.history.prices.map((p: number) => parseInt(String(p).slice(-1)));
                    setMultiAssetDigits(prev => ({ ...prev, [symbol]: digits.reverse() }));
                    if (symbol === asset) setLastDigits(digits);
                }
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) {
                        pendingContracts.current.set(data.buy.contract_id, {
                            signalId,
                            stake: data.echo_req.price,
                            strategyName: data.echo_req.passthrough?.strategyName,
                            contractType: data.echo_req.parameters.contract_type,
                            symbol: data.echo_req.parameters.symbol
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
                            const nextConsecutiveLosses = consecutiveLosses + 1;
                            setConsecutiveLosses(nextConsecutiveLosses);
                            martingaleLevel.current += 1;
                            setAiThought(`Loss em ${savedData.symbol}. Iniciando Gale...`);
                        } else {
                            winsRef.current += 1;
                            setWins(winsRef.current);
                            setConsecutiveLosses(0);
                            martingaleLevel.current = 0;
                            setVirtualLossStreak(0); 
                            setAiThought(`Vitória em ${savedData.symbol}!`);
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
    }, [asset, processTickData, setAccountBalance, setTradeStatus, addLog, setLastDigits, setTotalProfit, setWins, setLosses, setConsecutiveLosses, updateSignalResult, takeProfit, stopLoss, stopBot, setMultiAssetDigits]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 10) return null;

        if (martingaleLevel.current > 0 && lastTradedAsset.current === symbol) {
            const contract = lastContractType.current || 'DIGITEVEN';
            return { 
                type: contract === 'DIGITEVEN' ? 'EVEN' : contract === 'DIGITODD' ? 'ODD' : contract === 'CALL' ? 'CALL' : 'PUT', 
                contract, 
                name: 'Recuperação Sniper', 
                confidence: 100, 
                details: `Gale Nível ${martingaleLevel.current} em ${symbol}`,
                symbol
            };
        } else if (martingaleLevel.current > 0) {
            return null; 
        }

        // Lógica para Rise/Fall (Sobe/Desce)
        if (digitTradeMode === 'riseFall' || digitTradeMode === 'multimodal') {
            const lastPrice = lastPrices.current[symbol];
            const prevPrice = lastPrice; // Simplificado para exemplo
            // Aqui poderíamos ter um histórico de preços para analisar tendência
            // Por enquanto, vamos usar uma lógica baseada na paridade do dígito para decidir Rise/Fall no modo multimodal
            if (digitTradeMode === 'riseFall') {
                const isEven = digits[0] % 2 === 0;
                const targetType = isEven ? 'CALL' : 'PUT';
                return {
                    type: targetType,
                    contract: targetType,
                    name: 'WAVE Rise/Fall',
                    confidence: 80,
                    details: `Análise de Fluxo em ${symbol}`,
                    symbol
                };
            }
        }

        // Lógica para Even/Odd (Par/Ímpar)
        if (digitTradeMode === 'evenOdd' || digitTradeMode === 'multimodal') {
            let currentStreak = 1;
            const firstParity = digits[0] % 2 === 0;
            for (let i = 1; i < digits.length; i++) {
                if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
                else break;
            }
            if (currentStreak > 4) return null;

            if (currentStreak === consecutiveTarget) {
                const streakParity = firstParity ? 'EVEN' : 'ODD';
                let targetType: 'EVEN' | 'ODD';
                if (entryDirection === 'AGAINST') targetType = streakParity === 'EVEN' ? 'ODD' : 'EVEN';
                else targetType = streakParity === 'EVEN' ? 'EVEN' : 'ODD';
                
                return { 
                    type: targetType, 
                    contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                    name: isSmartModeActive ? 'SMART NEURAL' : 'WAVE Sniper', 
                    confidence: 85, 
                    details: `${entryDirection === 'AGAINST' ? 'Reversão' : 'Tendência'} ${currentStreak}x em ${symbol}`,
                    symbol
                };
            }
        }

        return null;
    }, [multiAssetDigits, consecutiveTarget, entryDirection, isStudying, isSmartModeActive, digitTradeMode]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string) => {
        if (!isConnected || isStudying || activeTrades.current.size > 0) return;
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
            symbol: symbol 
        };
        
        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        setAiThought(`Entrando em ${symbol} via ${strategyName}...`);
        addLog(`Entrada REAL em ${symbol} ($${stakeToUse.toFixed(2)})`, "INFO");
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying, addLog]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS) {
            const signal = calculateTradeSignal(symbol);
            if (signal) {
                const shouldWaitVirtual = virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses && (martingaleLevel.current === 0 || consecutiveLosses === 2);
                
                if (shouldWaitVirtual) {
                    if (!virtualTradePending) {
                        setAiThought(`Padrão em ${symbol}. Iniciando filtro virtual...`);
                        const sId = addSignal({ strategy: `VIRTUAL: ${signal.name}`, signal: signal.type as any, details: `Simulação em ${symbol}`, winRate: `85%` });
                        setVirtualTradePending({ ...signal, signalId: sId, symbol });
                    }
                    break;
                }
                
                if (activeTrades.current.size === 0) {
                    const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: signal.details, winRate: `85%` });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTargetLosses, virtualLossStreak, virtualTradePending, consecutiveLosses]);

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