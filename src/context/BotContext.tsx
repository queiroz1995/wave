"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';

const BotContext = createContext<any>(undefined);

const SCAN_SYMBOLS = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];

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
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number | string, symbol: string } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    // Estado para múltiplos mercados
    const [marketsData, setMarketsData] = useState<Record<string, { lastDigits: number[], priceHistory: number[], lastEpoch: number | null }>>({});

    const {
        addLog, setAccountBalance, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        initialStake, addSignal, updateSignalResult,
        setActiveContract, setTradeStatus,
        digitPrediction, isBotRunning,
        setActiveStrategy, realToken, demoToken, accountType,
        takeProfit, maxLevels, isMartingaleActive, digitTradeMode,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // --- MOTOR DE DECISÃO MULTIMERCADO ---
    const getBestOpportunity = useCallback(() => {
        const opportunities: any[] = [];

        Object.entries(marketsData).forEach(([symbol, data]) => {
            const { lastDigits, priceHistory } = data;
            if (lastDigits.length < 20 || priceHistory.length < 10) return;

            const symbolAnalysis = [];

            // 1. RISE/FALL
            const trend = priceHistory[0] - priceHistory[5];
            const rfProb = 50 + (trend > 0 ? 15 : -15);
            symbolAnalysis.push({ symbol, type: rfProb > 50 ? 'CALL' : 'PUT', prob: rfProb > 50 ? rfProb : 100 - rfProb, label: rfProb > 50 ? 'RISE' : 'FALL', strategy: 'Trend Scanner', barrier: undefined });

            // 2. EVEN/ODD
            const evens = lastDigits.slice(0, 20).filter(d => d % 2 === 0).length;
            const evenProb = (evens / 20) * 100;
            symbolAnalysis.push({ symbol, type: evenProb > 50 ? 'DIGITEVEN' : 'DIGITODD', prob: evenProb > 50 ? evenProb : 100 - evenProb, label: evenProb > 50 ? 'EVEN' : 'ODD', strategy: 'Parity Scanner', barrier: undefined });

            // 3. OVER/UNDER
            const unders = lastDigits.slice(0, 20).filter(d => d < digitPrediction).length;
            const underProb = (unders / 20) * 100;
            symbolAnalysis.push({ symbol, type: underProb > 50 ? 'DIGITUNDER' : 'DIGITOVER', prob: underProb > 50 ? underProb : 100 - underProb, label: underProb > 50 ? 'UNDER' : 'OVER', strategy: 'Barrier Scanner', barrier: digitPrediction });

            // 4. DIFFERS (Geralmente > 90%)
            const targetCount = lastDigits.slice(0, 30).filter(d => d === digitPrediction).length;
            const differsProb = 100 - ((targetCount / 30) * 100);
            symbolAnalysis.push({ symbol, type: 'DIGITDIFF', prob: differsProb, label: 'DIFFERS', strategy: 'Safe Scanner', barrier: digitPrediction });

            opportunities.push(...symbolAnalysis);
        });

        const best = opportunities.sort((a, b) => b.prob - a.prob)[0];
        return best && best.prob >= 70 ? best : null;
    }, [marketsData, digitPrediction]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;

        setMarketsData(prev => {
            const current = prev[tick.symbol] || { lastDigits: [], priceHistory: [], lastEpoch: null };
            return {
                ...prev,
                [tick.symbol]: {
                    lastDigits: [lastDigit, ...current.lastDigits].slice(0, 250),
                    priceHistory: [price, ...current.priceHistory].slice(0, 100),
                    lastEpoch: tick.epoch
                }
            };
        });
    }, []);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Conectado - ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                // Subscreve em todos os mercados
                SCAN_SYMBOLS.forEach(symbol => {
                    sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                    sendMessageRef.current({ ticks_history: symbol, end: "latest", count: 250, style: "ticks" });
                });
            } else if (data?.msg_type === 'history') {
                const symbol = data.echo_req.ticks_history;
                if (data.history?.prices) {
                    const prices = data.history.prices;
                    setMarketsData(prev => ({
                        ...prev,
                        [symbol]: {
                            lastDigits: prices.map((p: any) => parseInt(String(p).slice(-1))).reverse(),
                            priceHistory: [...prices].reverse(),
                            lastEpoch: data.history.times[data.history.times.length - 1]
                        }
                    }));
                }
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); setActiveContract({ contract_id: data.buy.contract_id }); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false; setTradeStatus('IDLE');
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) { setLastCompletedContract(poc); if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id }); }
            }
        }
    }, [addLog, setAccountBalance, setActiveContract, setTradeStatus, processTickData]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((symbol: string, contractType: ContractType, strategyName: string, signalId: string | null, barrier: number | string | undefined) => {
        if (!isConnected) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = isMartingaleActive && martingaleLevel.current > 0 ? baseStake * Math.pow(2.2, martingaleLevel.current) : baseStake;
        const stakeNum = parseFloat(stakeToUse.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol };
        if (barrier !== undefined) params.barrier = String(barrier);
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier, symbol };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, isConnected, initialStake, isMartingaleActive]);

    // Loop de monitoramento Multi-Mercado
    useEffect(() => {
        if (!isBotRunning || isTradeOpen.current) return;
        
        const opportunity = getBestOpportunity();
        if (opportunity) {
            const sId = addSignal({ 
                strategy: `[${opportunity.symbol}] ${opportunity.strategy}`, 
                signal: opportunity.label as any, 
                details: `Neural Conf: ${opportunity.prob.toFixed(0)}%`, 
                winRate: `${opportunity.prob.toFixed(0)}%` 
            });
            isTradeOpen.current = true;
            executeBuy(opportunity.symbol, opportunity.type as ContractType, opportunity.strategy, sId, opportunity.barrier);
        }
    }, [isBotRunning, getBestOpportunity, executeBuy, addSignal]);

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
            setWins(prev => prev + 1); martingaleLevel.current = 0;
        }

        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        isTradeOpen.current = false; setActiveContract(null); setTradeStatus('IDLE'); setLastCompletedContract(null);
        if (totalProfitRef.current >= parseFloat(takeProfit)) setIsBotRunning(false);
    }, [lastCompletedContract, activeContract, takeProfit, isMartingaleActive, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult, setIsBotRunning]);

    const selectAI = useCallback((ia: any) => { setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating'); }, [setActiveStrategy]);
    const exitToSelection = useCallback(() => { setIsBotRunning(false); setAppFlow('selection'); setSelectedAIInfo(null); }, [setIsBotRunning]);
    
    // Simplificando o export para o resto do app ver os dados do mercado ativo
    const activeMarketData = useMemo(() => {
        const primary = stateAndSetters.asset;
        return marketsData[primary] || { lastDigits: [], priceHistory: [], lastEpoch: null };
    }, [marketsData, stateAndSetters.asset]);

    const contextValue = useMemo(() => ({ 
        ...stateAndSetters, 
        lastDigits: activeMarketData.lastDigits,
        priceHistory: activeMarketData.priceHistory,
        lastTickEpoch: activeMarketData.lastEpoch,
        isConnected, status, handleConnect: (t?:any, tk?:any) => connect(tk || (t==='real'?realToken:demoToken), t||accountType), 
        handleDisconnect: disconnect, toggleBot: () => isBotRunning ? setIsBotRunning(false) : setIsBotRunning(true), 
        appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection 
    }), [stateAndSetters, activeMarketData, isConnected, status, connect, disconnect, isBotRunning, setIsBotRunning, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};