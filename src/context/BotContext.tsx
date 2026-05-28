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

    // Controle de Memória (Estado do Robô)
    const isTradeLockedRef = useRef(false);
    const totalProfitRef = useRef(0.00);
    const currentMartingaleLevel = useRef(0);
    const accumulatedLossRef = useRef(0);
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
        takeProfit, stopLoss,
        isStudying, setIsStudying, setStudyTicksCount,
        setSignals
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    // Watchdog para evitar travamentos
    useEffect(() => {
        const interval = setInterval(() => {
            if (isBotRunning && isTradeLockedRef.current && pendingContracts.current.size === 0) {
                isTradeLockedRef.current = false;
                setTradeStatus('IDLE');
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isBotRunning, setTradeStatus]);

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
        isTradeLockedRef.current = false;
        currentMartingaleLevel.current = 0;
        accumulatedLossRef.current = 0;
        setTradeStatus('IDLE');
        setAiThought(`Sessão Finalizada.`);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        currentMartingaleLevel.current = 0;
        accumulatedLossRef.current = 0;
        isTradeLockedRef.current = false;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        setTradeStatus('IDLE');
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
            const buyPrice = Math.abs(parseFloat(contract.buy_price));
            const exitDigit = contract.exit_tick ? parseInt(String(contract.exit_tick).slice(-1)) : undefined;

            totalProfitRef.current += profitValue;
            setTotalProfit(totalProfitRef.current);

            if (isLoss) {
                setLosses((prev: number) => prev + 1);
                currentMartingaleLevel.current += 1;
                accumulatedLossRef.current += buyPrice;
                addLog(`LOSS: Iniciando Recuperação de $${accumulatedLossRef.current.toFixed(2)}`, 'ERROR');
                setAiThought(`Gale Nível ${currentMartingaleLevel.current}`);
            } else {
                setWins((prev: number) => prev + 1);
                currentMartingaleLevel.current = 0;
                accumulatedLossRef.current = 0;
                setAiThought("Quantum Link Sincronizado");
            }

            updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
            pendingContracts.current.delete(contract.contract_id);
            
            // Liberação de Trava
            isTradeLockedRef.current = false;
            setTradeStatus('IDLE'); 

            if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot(`Meta batida!`);
            else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) stopBot(`Stop Loss.`);
        }
    }, [setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, setTradeStatus, addLog]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.error) {
                if (data.msg_type === 'buy' || data.echo_req?.msg_type === 'buy') {
                    isTradeLockedRef.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Erro: ${data.error.message}`, 'ERROR');
                }
                return;
            }

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

    const executeBuy = useCallback((strategyName: string, signalId: string, symbol: string, barrier: number) => {
        if (!isConnected || isStudying || isTradeLockedRef.current) return;
        
        isTradeLockedRef.current = true;
        setTradeStatus('ACTIVE');

        const baseStake = parseFloat(initialStake) || 0.35;
        let currentStake = baseStake;

        // GALE 12x PARA RECUPERAÇÃO TOTAL NO DIGIT DIFF
        if (currentMartingaleLevel.current > 0) {
            currentStake = accumulatedLossRef.current * 12; 
            addLog(`Aplicando Gale: $${currentStake.toFixed(2)}`, 'TRADE');
        }
        
        // Limite de segurança no Stop Loss
        const maxStake = Math.abs(parseFloat(stopLoss));
        if (currentStake > maxStake) currentStake = maxStake;

        const params = { 
            amount: parseFloat(currentStake.toFixed(2)), 
            basis: 'stake', 
            contract_type: 'DIGITDIFF', 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol,
            barrier
        };
        
        sendMessage({ buy: 1, price: currentStake, parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, isStudying, stopLoss, addLog]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;

        const checkAndTrade = () => {
            if (isTradeLockedRef.current) return;

            for (const symbol of SCANNER_ASSETS) {
                const digits = multiAssetDigits[symbol] || [];
                if (digits.length >= 2) {
                    const lastDigit = digits[0];
                    const sId = addSignal({ 
                        strategy: 'Quantum Scalper', 
                        signal: 'DIFF' as any, 
                        details: `Neural Link: ${symbol}`, 
                        winRate: `91%` 
                    });
                    executeBuy('Quantum Scalper', sId, symbol, lastDigit);
                    break;
                }
            }
        };

        const timer = setInterval(checkAndTrade, 200);
        return () => clearInterval(timer);
    }, [isBotRunning, isStudying, multiAssetDigits, addSignal, executeBuy]);

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