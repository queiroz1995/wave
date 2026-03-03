"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';

const BotContext = createContext<any>(undefined);

// Mercados que o bot vai monitorar simultaneamente no modo Multi-Mercado
const VOLATILITY_SCAN_LIST = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];

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
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number | string, asset: string } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    // Memória Multi-Mercado
    const marketData = useRef<Record<string, { lastDigits: number[], priceHistory: number[] }>>({});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        martingaleFactor,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        activeContract, isBotRunning,
        setActiveStrategy,
        realToken, demoToken, accountType,
        takeProfit, maxLevels,
        isMartingaleActive,
        digitTradeMode,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // --- MOTOR DE SCANNER MULTI-MERCADO ---
    const scanAllMarkets = useCallback(() => {
        const results: any[] = [];

        VOLATILITY_SCAN_LIST.forEach(symbol => {
            const data = marketData.current[symbol];
            if (!data || data.lastDigits.length < 20 || data.priceHistory.length < 10) return;

            const { lastDigits: ld, priceHistory: ph } = data;
            const currentAnalysis = [];

            // 1. RISE/FALL
            const trend = ph[0] - ph[5];
            const rfProb = 50 + (trend > 0 ? 15 : -15);
            currentAnalysis.push({ symbol, type: rfProb > 50 ? 'CALL' : 'PUT', prob: rfProb > 50 ? rfProb : 100 - rfProb, label: rfProb > 50 ? 'RISE' : 'FALL', strategy: 'Global Trend' });

            // 2. EVEN/ODD
            const evens = ld.slice(0, 20).filter(d => d % 2 === 0).length;
            const evenProb = (evens / 20) * 100;
            currentAnalysis.push({ symbol, type: evenProb > 50 ? 'DIGITEVEN' : 'DIGITODD', prob: evenProb > 50 ? evenProb : 100 - evenProb, label: evenProb > 50 ? 'EVEN' : 'ODD', strategy: 'Global Parity' });

            // 3. OVER/UNDER
            const unders = ld.slice(0, 20).filter(d => d < digitPrediction).length;
            const underProb = (unders / 20) * 100;
            currentAnalysis.push({ symbol, type: underProb > 50 ? 'DIGITUNDER' : 'DIGITOVER', prob: underProb > 50 ? underProb : 100 - underProb, label: underProb > 50 ? 'UNDER' : 'OVER', strategy: 'Global Barrier', barrier: digitPrediction });

            // 4. DIFFERS
            const targetCount = ld.slice(0, 30).filter(d => d === digitPrediction).length;
            const differsProb = 100 - ((targetCount / 30) * 100);
            currentAnalysis.push({ symbol, type: 'DIGITDIFF', prob: differsProb, label: 'DIFFERS', strategy: 'Global Shield', barrier: digitPrediction });

            const bestInThisMarket = currentAnalysis.sort((a, b) => b.prob - a.prob)[0];
            results.push(bestInThisMarket);
        });

        const globalBest = results.sort((a, b) => b.prob - a.prob)[0];
        return globalBest?.prob >= 75 ? globalBest : null;
    }, [digitPrediction]);

    // --- WEB SOCKET & SUBSCRIPTIONS ---
    useEffect(() => {
        if (isConnected) {
            // Cancela tudo e assina todos os mercados da lista de scan
            sendMessageRef.current({ forget_all: 'ticks' });
            VOLATILITY_SCAN_LIST.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                sendMessageRef.current({ ticks_history: symbol, end: "latest", count: 100, style: "ticks" });
            });
        }
    }, [isConnected]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        
        if (!marketData.current[symbol]) marketData.current[symbol] = { lastDigits: [], priceHistory: [] };
        
        const data = marketData.current[symbol];
        data.lastDigits = [lastDigit, ...data.lastDigits].slice(0, 100);
        data.priceHistory = [price, ...data.priceHistory].slice(0, 100);

        // Atualiza a UI se for o ativo principal
        if (symbol === asset) {
            setLastDigits(data.lastDigits);
            setLastTickEpoch(tick.epoch);
        }
    }, [asset, setLastDigits, setLastTickEpoch]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Scaneando: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
            } else if (data?.msg_type === 'history') {
                const symbol = data.echo_req.ticks_history;
                if (data.history?.prices) {
                    marketData.current[symbol] = {
                        lastDigits: data.history.prices.map((p: any) => parseInt(String(p).slice(-1))).reverse(),
                        priceHistory: [...data.history.prices].reverse()
                    };
                }
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) {
                    setTradeStatus('ACTIVE');
                    setActiveContract({ contract_id: data.buy.contract_id });
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false; setTradeStatus('IDLE');
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) setLastCompletedContract(poc);
            }
        }
    }, [addLog, setAccountBalance, setActiveContract, setTradeStatus, processTickData]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((symbol: string, contractType: ContractType, strategyName: string, signalId: string | null, barrier: number | string | undefined) => {
        if (!isConnected) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;
        if (isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        
        const stakeNum = parseFloat(stakeToUse.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol };
        if (barrier !== undefined) params.barrier = String(barrier);
        
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier, asset: symbol };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, initialStake, isMartingaleActive, martingaleFactor, isConnected]);

    // LOOP DE EXECUÇÃO NEURAL
    useEffect(() => {
        if (!isBotRunning || isTradeOpen.current) return;
        
        const decision = scanAllMarkets();
        if (decision) {
            const sId = addSignal({ 
                strategy: `${decision.strategy} [${decision.symbol.replace('1HZ', 'V')}]`, 
                signal: decision.label as any, 
                details: `Neural: ${decision.prob.toFixed(0)}%`, 
                winRate: `${decision.prob.toFixed(0)}%` 
            });
            isTradeOpen.current = true;
            addLog(`Gatilho detectado em ${decision.symbol}: ${decision.label}`, 'TRADE');
            executeBuy(decision.symbol, decision.type as ContractType, decision.strategy, sId, decision.barrier);
        }
    }, [isBotRunning, scanAllMarkets, executeBuy, addSignal, addLog]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, contract_id, exit_tick } = lastCompletedContract;
        if (activeContract?.contract_id !== contract_id) return;
        
        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const lastTrade = lastTradeDetails.current;

        setAccountBalance(prev => prev !== null ? prev + parseFloat(profit) : null);
        totalProfitRef.current += parseFloat(profit);
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses(prev => prev + 1);
            if (isMartingaleActive) martingaleLevel.current += 1;
        } else {
            setWins(prev => prev + 1);
            martingaleLevel.current = 0;
        }

        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        isTradeOpen.current = false; setActiveContract(null); setTradeStatus('IDLE'); setLastCompletedContract(null);
        
        if (totalProfitRef.current >= parseFloat(takeProfit)) {
            setIsBotRunning(false);
            addLog("Meta Diária Batida!", "WIN");
        }
        if (martingaleLevel.current > maxLevels) martingaleLevel.current = 0;
    }, [lastCompletedContract, activeContract, takeProfit, maxLevels, isMartingaleActive, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult, setIsBotRunning, addLog]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating'); }, [setActiveStrategy]);
    const exitToSelection = useCallback(() => { setIsBotRunning(false); setAppFlow('selection'); setSelectedAIInfo(null); }, [setIsBotRunning]);
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) {
            setIsBotRunning(false);
            isTradeOpen.current = false;
        } else {
            setIsBotRunning(true);
            totalProfitRef.current = 0;
            setTotalProfit(0);
            setWins(0);
            setLosses(0);
            martingaleLevel.current = 0;
        }
    }, [isConnected, isBotRunning, setIsBotRunning, setTotalProfit, setWins, setLosses]);

    const contextValue = useMemo(() => ({ ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);
    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};