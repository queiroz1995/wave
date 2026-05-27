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
        setNeuralPredictions,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, entryDirection,
        isSmartModeActive,
        setSignals
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
        if (digits.length < 50) return { confidence: 0, entropy: 1, recommendedVirtualLosses: 1 };
        
        const evens = digits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const entropy = calculateEntropy(digits);
        const confidence = Math.floor((70 + (bias * 30)) * (1.2 - (entropy * 0.2)));
        
        let recVirtual = 1;
        let riskLabel = "Normal";

        if (entropy > 0.96) { recVirtual = 4; riskLabel = "Extremo"; }
        else if (entropy > 0.92) { recVirtual = 3; riskLabel = "Alta Instabilidade"; }
        else if (entropy > 0.86) { recVirtual = 2; riskLabel = "Instável"; }
        else if (bias > 0.18) { recVirtual = 0; riskLabel = "Tendência Forte"; }
        else { recVirtual = 1; riskLabel = "Estável"; }

        if (symbol === asset) {
            setCurrentConfidence(Math.min(99, confidence));
        }
        
        return { confidence, entropy, recommendedVirtualLosses: recVirtual, riskLabel };
    }, [multiAssetDigits, asset]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, count: 500, end: "latest", style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected) {
            addLog("Iniciando monitoramento de ativos...", "INFO");
            SCANNER_ASSETS.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                fetchDerivHistory(symbol);
            });
        }
    }, [isConnected, fetchDerivHistory, addLog]);

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

        const { recommendedVirtualLosses, riskLabel } = getMarketState(symbol);

        if (virtualTradePending && virtualTradePending.symbol === symbol) {
            let win = false;
            if (virtualTradePending.contract === 'DIGITEVEN') win = lastDigit % 2 === 0;
            else if (virtualTradePending.contract === 'DIGITODD') win = lastDigit % 2 !== 0;

            if (win) {
                setVirtualLossStreak(0);
                updateSignalResult(virtualTradePending.signalId, 'WIN', 0, 0, lastDigit);
                setAiThought(`Vitória Virtual em ${symbol}. Reiniciando proteção.`);
                addLog(`[VIRTUAL] Win em ${symbol}. Resetando filtro.`, "INFO");
            } else {
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                updateSignalResult(virtualTradePending.signalId, 'LOSS', 0, 0, lastDigit);
                
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                if (nextStreak >= target) {
                    setAiThought(`Proteção de ${target} níveis atingida em ${symbol}. Pronto!`);
                    addLog(`[VIRTUAL] Alvo atingido: ${nextStreak}/${target} perdas em ${symbol}.`, "TRADE");
                } else {
                    setAiThought(`Proteção: ${nextStreak}/${target} Loss Virtual em ${symbol}.`);
                    addLog(`[VIRTUAL] Loss detectado. Progresso: ${nextStreak}/${target}.`, "INFO");
                }
            }
            setVirtualTradePending(null);
        }

        if (isStudying && symbol === asset) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 5) {
                    setIsStudying(false);
                    addLog("Sincronização concluída. Iniciando análise de fluxo.", "INFO");
                    return 0;
                }
                return next;
            });
        }
    }, [asset, getMarketState, isStudying, setIsStudying, setStudyTicksCount, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, updateSignalResult, addLog]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        setAiThought("Bot Parado.");
        addLog(`Bot Finalizado: ${reason}`, 'ERROR');
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
        addLog("Histórico e lucros resetados.", "INFO");
    }, [setTotalProfit, setWins, setLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (!isConnected) {
            addLog("Não é possível iniciar: Sem conexão com Deriv.", "ERROR");
            return;
        }
        if (isBotRunning) {
            stopBot("Sniper Parado pelo Usuário");
        } else { 
            setIsBotRunning(true); 
            resetOperations();
            setIsStudying(true);
            setAiThought("Varrendo ativos por manipulação...");
            addLog("Protocolo de Partida Iniciado.", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations, addLog]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Sincronizado`, color: 'bg-green-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                sendMessageRef.current({ balance: 1, subscribe: 1 });
                addLog(`Autenticado com sucesso na conta ${data.authorize.loginid}`, "INFO");
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
                        addLog(`Ordem executada no servidor ID: ${data.buy.contract_id}`, "INFO");
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
                            setAiThought("Detectada variância. Entrando em modo defensivo.");
                            addLog(`[RESULTADO] Loss de $${Math.abs(profitValue).toFixed(2)} em ${savedData.symbol}. Nível Martingale: ${martingaleLevel.current}`, "LOSS");
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            setVirtualLossStreak(0);
                            setAiThought("Operação Neutralizada com Sucesso.");
                            addLog(`[RESULTADO] Win de $${profitValue.toFixed(2)} em ${savedData.symbol}. Voltando ao ciclo base.`, "WIN");
                        }

                        updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                        activeTrades.current.delete(savedData.signalId);
                        pendingContracts.current.delete(contract.contract_id);
                        setTradeStatus('IDLE'); 

                        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot(`Meta batida: +$${totalProfitRef.current.toFixed(2)}`);
                        else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) stopBot(`Stop Loss: -$${Math.abs(totalProfitRef.current).toFixed(2)}`);
                    }
                }
            }
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, addLog]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 5) return null;

        if (martingaleLevel.current > 0 && lastTradedAsset.current === symbol) {
            const contract = lastContractType.current || 'DIGITEVEN';
            return { type: contract === 'DIGITEVEN' ? 'EVEN' : 'ODD', contract, name: 'Recovery', confidence: 99, symbol };
        }

        let currentStreak = 1;
        const firstParity = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
            else break;
        }

        if (currentStreak >= consecutiveTarget) {
            const targetType = entryDirection === 'AGAINST' ? (firstParity ? 'ODD' : 'EVEN') : (firstParity ? 'EVEN' : 'ODD');
            return { 
                type: targetType, 
                contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                name: 'WAVE', 
                confidence: 85 + (currentStreak * 2), 
                symbol 
            };
        }
        return null;
    }, [multiAssetDigits, consecutiveTarget, entryDirection, isStudying]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string) => {
        if (!isConnected || isStudying || activeTrades.current.size > 0) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        
        const params = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol };
        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        
        addLog(`[EXECUTANDO] Entrada Real em ${symbol} ($${stakeToUse.toFixed(2)})`, "TRADE");
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying, addLog]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS) {
            const signal = calculateTradeSignal(symbol);
            if (signal) {
                const { recommendedVirtualLosses, riskLabel } = getMarketState(symbol);
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                const needsVirtual = target > 0 && virtualLossStreak < target;
                
                if (needsVirtual) {
                    if (!virtualTradePending) {
                        const sId = addSignal({ strategy: `VIRTUAL (IA: ${target}L)`, signal: signal.type as any, details: `Risco ${riskLabel} em ${symbol}`, winRate: `${signal.confidence}%` });
                        setVirtualTradePending({ ...signal, signalId: sId, symbol });
                        addLog(`[VIRTUAL] Analisando proteção em ${symbol}. Alvo: ${target} perdas.`, "INFO");
                    }
                    break;
                }
                
                if (activeTrades.current.size === 0) {
                    const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: `Entrada Limpa em ${symbol}`, winRate: `${signal.confidence}%` });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, getMarketState, addLog]);

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