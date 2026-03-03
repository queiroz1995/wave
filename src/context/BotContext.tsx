"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';

const BotContext = createContext<any>(undefined);

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
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number | string } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const previousAsset = useRef<string | null>(null);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setCurrentSignal,
        martingaleFactor,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        activeContract, isBotRunning,
        activeStrategy, setActiveStrategy,
        realToken, demoToken, accountType,
        takeProfit, maxLevels,
        isMartingaleActive,
        digitTradeMode,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [priceHistory, setPriceHistory] = useState<number[]>([]);

    // --- MOTOR NEURAL DE DECISÃO INTEGRADO (7 MODALIDADES) ---
    const getBestNeuralBet = useCallback(() => {
        if (!lastDigits || !priceHistory || lastDigits.length < 20 || priceHistory.length < 10) return null;

        const candidates = [];
        
        // 1. RISE/FALL
        const shortTrend = priceHistory[0] - priceHistory[4];
        const momentum = priceHistory[0] - priceHistory[9];
        const rfProb = 50 + (shortTrend > 0 ? 5 : -5) + (momentum > 0 ? 10 : -10);
        candidates.push({ 
            type: rfProb > 50 ? 'CALL' : 'PUT', 
            prob: rfProb > 50 ? rfProb : 100 - rfProb, 
            strategy: 'Neural Trend', 
            barrier: undefined,
            label: rfProb > 50 ? 'RISE' : 'FALL'
        });

        // 2. ODD/EVEN
        const evens = lastDigits.slice(0, 20).filter(d => d % 2 === 0).length;
        const evenProb = (evens / 20) * 100;
        candidates.push({ 
            type: evenProb > 50 ? 'DIGITEVEN' : 'DIGITODD', 
            prob: evenProb > 50 ? evenProb : 100 - evenProb, 
            strategy: 'Digit Parity', 
            barrier: undefined,
            label: evenProb > 50 ? 'EVEN' : 'ODD'
        });

        // 3. OVER/UNDER
        const unders = lastDigits.slice(0, 20).filter(d => d < digitPrediction).length;
        const underProb = (unders / 20) * 100;
        candidates.push({ 
            type: underProb > 50 ? 'DIGITUNDER' : 'DIGITOVER', 
            prob: underProb > 50 ? underProb : 100 - underProb, 
            strategy: 'Barrier Flow', 
            barrier: digitPrediction,
            label: underProb > 50 ? 'UNDER' : 'OVER'
        });

        // 4. MATCHES/DIFFERS (Alta probabilidade)
        const targetCount = lastDigits.slice(0, 30).filter(d => d === digitPrediction).length;
        const differsProb = 100 - ((targetCount / 30) * 100);
        candidates.push({ 
            type: 'DIGITDIFF', 
            prob: differsProb, 
            strategy: 'Safety Differs', 
            barrier: digitPrediction,
            label: 'DIFFERS'
        });

        // 5. HIGH/LOW (Adaptado via CALL/PUT com barreira)
        const avg = priceHistory.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const hlProb = priceHistory[0] > avg ? 62 : 58;
        candidates.push({ 
            type: priceHistory[0] > avg ? 'CALL' : 'PUT', 
            prob: hlProb, 
            strategy: 'Level Analysis', 
            barrier: priceHistory[0] > avg ? '+0.01' : '-0.01',
            label: priceHistory[0] > avg ? 'HIGH' : 'LOW'
        });

        // Ordena por maior probabilidade absoluta
        const best = candidates.sort((a, b) => b.prob - a.prob)[0];
        
        // Só entra se a probabilidade for significativa (>65%)
        return best.prob >= 65 ? best : null;
    }, [lastDigits, priceHistory, digitPrediction]);

    const fetchInitialTicks = useCallback(async () => {
        if (!asset) return;
        try {
            const { data, error } = await supabase.from('ticks').select('digit, epoch').eq('symbol', asset).order('epoch', { ascending: false }).limit(250);
            if (error) {
                if (isConnected) sendMessageRef.current({ ticks_history: asset, end: "latest", count: 250, style: "ticks" });
                return;
            }
            if (data?.length > 0) {
                setLastDigits(data.map(t => t.digit));
                setLastTickEpoch(data[0].epoch);
            }
        } catch (e) { console.error(e); }
    }, [asset, isConnected, setLastDigits, setLastTickEpoch]);

    useEffect(() => { 
        fetchInitialTicks(); 
        if (isConnected && previousAsset.current !== asset) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            sendMessageRef.current({ ticks_history: asset, end: "latest", count: 250, style: "ticks" });
        }
        previousAsset.current = asset;
    }, [asset, fetchInitialTicks, isConnected]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setPriceHistory(prev => [price, ...prev].slice(0, 100));
        setLastTickEpoch(tick.epoch);
    }, [setLastDigits, setLastTickEpoch]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Conectado - ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
                sendMessageRef.current({ ticks_history: asset, end: "latest", count: 250, style: "ticks" });
            } else if (data?.msg_type === 'history') {
                if (data.history?.prices) {
                   const prices = data.history.prices;
                   setLastDigits(prices.map((p: any) => parseInt(String(p).slice(-1))).reverse());
                   setPriceHistory([...prices].reverse());
                }
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
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
                if (poc?.is_sold) {
                    setLastCompletedContract(poc);
                    if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id });
                }
            }
        }
    }, [addLog, setAccountBalance, setActiveContract, setTradeStatus, asset, processTickData, setLastDigits]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number | string | undefined) => {
        if (!isConnected) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;
        if (isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        
        const stakeNum = parseFloat(stakeToUse.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (barrier !== undefined) params.barrier = String(barrier);
        
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, asset, setTradeStatus, isConnected, initialStake, isMartingaleActive, martingaleFactor]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        let decision = null;

        if (digitTradeMode === 'multimodal') {
            decision = getBestNeuralBet();
        } else if (digitTradeMode === 'evenOdd') {
            const evens = lastDigits.slice(0, 10).filter(d => d % 2 === 0).length;
            if (evens >= 7) decision = { type: 'DIGITODD', strategy: 'IA Digit Focus', barrier: undefined, prob: 70, label: 'ODD' };
            else if (evens <= 3) decision = { type: 'DIGITEVEN', strategy: 'IA Digit Focus', barrier: undefined, prob: 70, label: 'EVEN' };
        }

        if (decision) {
            const sId = addSignal({ 
                strategy: decision.strategy, 
                signal: decision.label as any, 
                details: `Prob Neural: ${decision.prob.toFixed(0)}%`, 
                winRate: `${decision.prob.toFixed(0)}%` 
            });
            isTradeOpen.current = true; 
            executeBuy(decision.type as ContractType, decision.strategy, sId, decision.barrier);
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, digitTradeMode, getBestNeuralBet, executeBuy, addSignal]);

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

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta Batida!");
        if (martingaleLevel.current > maxLevels) martingaleLevel.current = 0;
    }, [lastCompletedContract, activeContract, takeProfit, maxLevels, isMartingaleActive, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult]);

    const selectAI = useCallback((ia: any) => {
        setSelectedAIInfo(ia); setActiveStrategy(ia.id); setAppFlow('operating');
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => {
        stopBot("Sessão Encerrada"); setAppFlow('selection'); setSelectedAIInfo(null);
    }, [stopBot]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Parado");
        else { 
            setIsBotRunning(true); totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); martingaleLevel.current = 0; 
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, priceHistory
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection, priceHistory]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};