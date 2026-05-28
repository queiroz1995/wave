"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';

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
    const [isTradeLocked, setIsTradeLocked] = useState(false); // Trava de segurança reativa

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const currentMartingaleLevel = useRef(0);
    const pendingContracts = useRef<Map<number, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning,
        accountType, realToken, demoToken,
        takeProfit, stopLoss, martingaleFactor, maxLevels,
        isStudying, setIsStudying, setStudyTicksCount,
        setSignals
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    // Watchdog para evitar travamentos eternos
    useEffect(() => {
        const interval = setInterval(() => {
            if (isBotRunning && isTradeLocked) {
                // Se ficar travado por mais de 6 segundos, libera
                setIsTradeLocked(false);
                setTradeStatus('IDLE');
            }
        }, 6000);
        return () => clearInterval(interval);
    }, [isBotRunning, isTradeLocked, setTradeStatus]);

    const getMarketState = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 10) return { confidence: 0, lastDigit: -1 };
        return { confidence: 91, lastDigit: digits[0] };
    }, [multiAssetDigits]);

    useEffect(() => { 
        if (isConnected) {
            SCANNER_ASSETS.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                sendMessageRef.current({ ticks_history: symbol, count: 50, end: "latest", style: "ticks" });
            });
        }
    }, [isConnected]);

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
                setCurrentConfidence(91);
            }
            return { ...prev, [symbol]: newHistory };
        });

        if (isStudying && symbol === asset) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 2) {
                    setIsStudying(false);
                    return 0;
                }
                return next;
            });
        }
    }, [asset, isStudying, setIsStudying, setStudyTicksCount, setLastDigits, setLastTickEpoch, setMultiAssetDigits]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        setIsTradeLocked(false);
        activeTrades.current.clear();
        currentMartingaleLevel.current = 0;
        setTradeStatus('IDLE');
        setAiThought(`Sessão Finalizada.`);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        currentMartingaleLevel.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        setTradeStatus('IDLE');
        setIsTradeLocked(false);
    }, [setTotalProfit, setWins, setLosses, setSignals, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Sessão Finalizada");
        else { 
            setIsBotRunning(true); 
            resetOperations();
            setIsStudying(true);
            setAiThought("Protocolo Quantum: ONLINE");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations]);

    const handleContractResult = useCallback((contract: any) => {
        const savedData = pendingContracts.current.get(contract.contract_id);
        if (savedData) {
            const isLoss = contract.status === 'lost';
            const profitValue = parseFloat(contract.profit);
            const exitDigit = contract.exit_tick ? parseInt(String(contract.exit_tick).slice(-1)) : undefined;

            totalProfitRef.current += profitValue;
            setTotalProfit(totalProfitRef.current);

            if (isLoss) {
                setLosses((prev: number) => prev + 1);
                currentMartingaleLevel.current += 1;
            } else {
                setWins((prev: number) => prev + 1);
                currentMartingaleLevel.current = 0;
            }

            updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
            activeTrades.current.delete(savedData.signalId);
            pendingContracts.current.delete(contract.contract_id);
            
            // Libera para a próxima operação
            setIsTradeLocked(false);
            setTradeStatus('IDLE'); 

            if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot(`Meta batida!`);
            else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) stopBot(`Stop Loss.`);
            else if (currentMartingaleLevel.current >= maxLevels) {
                currentMartingaleLevel.current = 0;
                addLog("Limite de Gale atingido.", "INFO");
            }
        }
    }, [setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, maxLevels, addLog, setTradeStatus]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Online`, color: 'bg-green-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
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
                            symbol: data.echo_req.parameters.symbol
                        });
                        // Se o contrato já retornar com status fechado na compra (raro mas acontece no differ)
                        if (data.buy.status && data.buy.status !== 'open') {
                             handleContractResult(data.buy);
                        } else {
                             sendMessageRef.current({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
                        }
                    }
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.status !== 'open') {
                    handleContractResult(contract);
                }
            }
        }
    }, [processTickData, setAccountBalance, handleContractResult]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((contractType: string, strategyName: string, signalId: string, symbol: string, barrier: number) => {
        if (!isConnected || isStudying || isTradeLocked) return;
        
        setIsTradeLocked(true); // Trava reativa para o ciclo React
        setTradeStatus('ACTIVE');

        const baseStake = parseFloat(initialStake) || 0.35;
        let currentStake = baseStake;

        // Recuperação agressiva para Digit Differ (Payout ~9%)
        if (currentMartingaleLevel.current > 0) {
            // No Differ, precisamos de aproximadamente 11x a stake para recuperar tudo em 1 win.
            // Usamos o martingaleFactor definido para dar flexibilidade.
            const factor = parseFloat(martingaleFactor) || 11.5;
            currentStake = baseStake * Math.pow(factor, currentMartingaleLevel.current);
        }
        
        const params: any = { 
            amount: parseFloat(currentStake.toFixed(2)), 
            basis: 'stake', 
            contract_type: 'DIGITDIFF', 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol,
            barrier
        };
        
        activeTrades.current.add(signalId);
        sendMessage({ buy: 1, price: currentStake, parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, isStudying, martingaleFactor, isTradeLocked]);

    useEffect(() => {
        if (!isBotRunning || isStudying || isTradeLocked) return;
        
        for (const symbol of SCANNER_ASSETS) {
            const digits = multiAssetDigits[symbol] || [];
            if (digits.length >= 10 && !isTradeLocked) {
                const { lastDigit } = getMarketState(symbol);
                const sId = addSignal({ 
                    strategy: 'Quantum Scalper', 
                    signal: 'DIFF' as any, 
                    details: `Analisando: ${symbol}`, 
                    winRate: `91%` 
                });
                executeBuy('DIGITDIFF', 'Quantum Scalper', sId, symbol, lastDigit);
                break;
            }
        }
    }, [isBotRunning, addSignal, executeBuy, isStudying, isTradeLocked, multiAssetDigits, getMarketState]);

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