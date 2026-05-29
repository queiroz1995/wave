"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { toast } from "sonner";

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

    const isTradeLockedRef = useRef(false);
    const lastTradeAttemptTime = useRef(0);
    const totalProfitRef = useRef(0.00);
    const currentMartingaleLevel = useRef(0);
    const accumulatedLossRef = useRef(0);
    const pendingContracts = useRef<Map<number, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    
    // Rastreador de Loss Virtual por Ativo
    const virtualStreaksRef = useRef<Record<string, number>>({});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, setAsset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning,
        accountType, realToken, demoToken,
        takeProfit, stopLoss,
        setSignals, consecutiveTarget, entryDirection,
        virtualLossStreak, setVirtualLossStreak, virtualTargetLosses
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    useEffect(() => {
        const watchdog = setInterval(() => {
            if (isBotRunning && isTradeLockedRef.current) {
                const now = Date.now();
                if (now - lastTradeAttemptTime.current > 8000) {
                    isTradeLockedRef.current = false;
                    setTradeStatus('IDLE');
                    addLog("Sistema: Recuperação de travamento executada.", "INFO");
                    setAiThought("Reiniciando Link de Dados...");
                }
            }
        }, 2000);
        return () => clearInterval(watchdog);
    }, [isBotRunning, setTradeStatus, addLog]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
        setMultiAssetDigits((prev: Record<string, number[]>) => {
            const currentHistory = prev[symbol] || [];
            const newHistory = [lastDigit, ...currentHistory].slice(0, 50);
            if (symbol === asset) {
                setLastDigits(newHistory);
                setLastTickEpoch(tick.epoch);
            }
            return { ...prev, [symbol]: newHistory };
        });
    }, [asset, setLastDigits, setLastTickEpoch, setMultiAssetDigits]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeLockedRef.current = false;
        currentMartingaleLevel.current = 0;
        accumulatedLossRef.current = 0;
        setVirtualLossStreak(0);
        virtualStreaksRef.current = {};
        setTradeStatus('IDLE');
        setAiThought(`Sessão Finalizada.`);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus, setVirtualLossStreak]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        currentMartingaleLevel.current = 0;
        accumulatedLossRef.current = 0;
        isTradeLockedRef.current = false;
        setVirtualLossStreak(0);
        virtualStreaksRef.current = {};
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        setTradeStatus('IDLE');
    }, [setTotalProfit, setWins, setLosses, setSignals, setTradeStatus, setVirtualLossStreak]);

    const toggleBot = useCallback(() => {
        if (!isConnected) {
            toast.error("Conecte seu Token antes de iniciar.");
            return;
        }

        if (isBotRunning) {
            stopBot("Sessão Finalizada.");
        } else { 
            setIsBotRunning(true); 
            resetOperations();
            setAiThought("Scanner Multiativos Iniciado...");
            addLog("Bot Iniciado - Scanner Ativo.", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations, addLog]);

    const handleContractResult = useCallback((contract: any) => {
        const savedData = pendingContracts.current.get(contract.contract_id);
        if (savedData) {
            const isLoss = contract.status === 'lost';
            const profitValue = parseFloat(contract.profit);
            const buyPrice = Math.abs(parseFloat(contract.buy_price));
            const exitDigit = contract.exit_tick ? parseInt(String(contract.exit_tick).slice(-1)) : undefined;

            totalProfitRef.current += profitValue;
            setTotalProfit(totalProfitRef.current);

            if (isLoss) {
                setLosses((prev: number) => prev + 1);
                currentMartingaleLevel.current += 1;
                accumulatedLossRef.current += buyPrice;
                addLog(`LOSS REAL: ${savedData.strategyName} - Recuperando...`, 'ERROR');
            } else {
                setWins((prev: number) => prev + 1);
                currentMartingaleLevel.current = 0;
                accumulatedLossRef.current = 0;
                addLog(`WIN REAL: ${savedData.strategyName} - Alvo Atingido`, 'WIN');
            }

            updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
            pendingContracts.current.delete(contract.contract_id);
            
            isTradeLockedRef.current = false;
            setTradeStatus('IDLE'); 

            if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot(`Meta batida! Lucro: $${totalProfitRef.current.toFixed(2)}`);
            else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) stopBot(`Stop Loss atingido.`);
        }
    }, [setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, setTradeStatus, addLog]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.error) {
                if (data.msg_type === 'buy') {
                    isTradeLockedRef.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Erro Corretora: ${data.error.message}`, 'ERROR');
                }
                return;
            }

            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Online`, color: 'bg-green-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                SCANNER_ASSETS.forEach(symbol => {
                    sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                });
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) setAccountBalance(parseFloat(data.balance.balance));
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    const signalId = data.echo_req.passthrough?.signalId;
                    const contractId = data.buy.contract_id;
                    if (signalId && contractId) {
                        pendingContracts.current.set(contractId, {
                            signalId,
                            stake: data.echo_req.price,
                            strategyName: data.echo_req.passthrough?.strategyName
                        });
                        sendMessageRef.current({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
                    }
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.status !== 'open') {
                    handleContractResult(contract);
                }
            }
        }
    }, [processTickData, setAccountBalance, handleContractResult, addLog, setTradeStatus]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((strategyName: string, signalId: string, symbol: string, type: 'DIGITEVEN' | 'DIGITODD' | 'DIGITDIFF', barrier?: number) => {
        if (!isConnected || isTradeLockedRef.current) return;
        
        isTradeLockedRef.current = true;
        lastTradeAttemptTime.current = Date.now();
        setTradeStatus('ACTIVE');

        const baseStake = parseFloat(initialStake) || 0.35;
        let currentStake = baseStake;

        if (currentMartingaleLevel.current > 0) {
            currentStake = accumulatedLossRef.current * 2.1; 
        }
        
        const params: any = { 
            amount: parseFloat(currentStake.toFixed(2)), 
            basis: 'stake', 
            contract_type: type, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol
        };
        
        if (type === 'DIGITDIFF' && barrier !== undefined) {
            params.barrier = barrier;
        }
        
        sendMessage({ buy: 1, price: currentStake, parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus]);

    useEffect(() => {
        if (!isBotRunning || !selectedAIInfo) return;

        const checkScanner = () => {
            if (isTradeLockedRef.current) return;

            let maxLossFound = 0;
            let bestAsset = asset;
            let bestSignal: any = null;

            // SCANNER EM TODOS OS ATIVOS
            SCANNER_ASSETS.forEach(sym => {
                const digits = multiAssetDigits[sym] || [];
                if (digits.length < consecutiveTarget) return;

                const recentDigits = digits.slice(0, consecutiveTarget);
                const allEven = recentDigits.every(d => d % 2 === 0);
                const allOdd = recentDigits.every(d => d % 2 !== 0);

                if (allEven || allOdd) {
                    // Calculamos o streak (loss virtual)
                    let streak = 0;
                    for (let d of digits) {
                        const isEven = d % 2 === 0;
                        if ((allEven && isEven) || (allOdd && !isEven)) streak++;
                        else break;
                    }

                    if (streak > maxLossFound) {
                        maxLossFound = streak;
                        bestAsset = sym;
                        bestSignal = entryDirection === 'AGAINST' 
                            ? (allEven ? 'DIGITODD' : 'DIGITEVEN') 
                            : (allEven ? 'DIGITEVEN' : 'DIGITODD');
                    }
                }
            });

            setVirtualLossStreak(maxLossFound);
            
            if (maxLossFound >= virtualTargetLosses && bestSignal) {
                setAiThought(`ALVO DETECTADO: ${bestAsset} com ${maxLossFound} Losses Virtuais!`);
                setCurrentConfidence(95);
                setAsset(bestAsset); // Muda para o ativo da oportunidade

                const sId = addSignal({ 
                    strategy: 'VIRTUAL WAVE', 
                    signal: (bestSignal === 'DIGITEVEN' ? 'EVEN' : 'ODD') as any, 
                    details: `Entrada Real em ${bestAsset} (LV: ${maxLossFound})`, 
                    winRate: `95%` 
                });
                executeBuy('Quantum Wave', sId, bestAsset, bestSignal);
            } else {
                setAiThought(`Monitorando 10 Ativos... Maior LV: ${maxLossFound}/${virtualTargetLosses}`);
                setCurrentConfidence(40 + (maxLossFound * 10));
            }
        };

        const timer = setInterval(checkScanner, 1000);
        return () => clearInterval(timer);
    }, [isBotRunning, selectedAIInfo, multiAssetDigits, asset, setAsset, consecutiveTarget, entryDirection, virtualTargetLosses, setVirtualLossStreak, addSignal, executeBuy]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setAppFlow('operating'); }, []);
    const exitToSelection = useCallback(() => { stopBot("Fim"); setAppFlow('selection'); }, [stopBot]);
    
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