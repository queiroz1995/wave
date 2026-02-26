"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType, SignalType } from '@/types/bot';
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

    const isTradeOpen = useRef(false);
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setChartData, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setCurrentSignal,
        martingaleFactor,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        setClosedHistory, setIsFetchingHistory,
        activeContract, isBotRunning,
        digitTradeMode,
        activeStrategy,
        realToken, demoToken, accountType,
        takeProfit, stopLoss, maxLevels,
        catalogerPatternLength, catalogerMinWinRate, catalogerMinOccurrences,
        isDoubleOneTriggerActive, doubleOneTriggerCount, doubleOneTriggerTargetDigits,
        isMartingaleActive,
        virtualLossStreak, setVirtualLossStreak,
        virtualWinStreak, setVirtualWinStreak,
        isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        isStreakFilterActive, maxStreakAllowed,
        neuralRicoWindow, neuralRicoThreshold,
        // PROBABILISTICA
        probWindow, reverseOnLoss,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    const fetchInitialTicks = useCallback(async () => {
        if (!asset) return;
        try {
            const { data, error } = await supabase.from('ticks').select('digit, epoch').eq('symbol', asset).order('epoch', { ascending: false }).limit(250);
            if (!error && data?.length > 0) {
                setLastDigits(data.map(t => t.digit));
                setLastTickEpoch(data[0].epoch);
            }
        } catch (e) {}
    }, [asset, setLastDigits, setLastTickEpoch]);

    useEffect(() => { fetchInitialTicks(); }, [fetchInitialTicks]);

    const fetchClosedHistory = useCallback(async () => {
        setIsFetchingHistory(true);
        try {
            const { data } = await supabase.from('ticks').select('digit, epoch, symbol').order('epoch', { ascending: false }).limit(250);
            if (data) setClosedHistory(data);
        } catch (e) {} finally { setIsFetchingHistory(false); }
    }, [setIsFetchingHistory, setClosedHistory]);

    const smartAIAnalysis = useMemo(() => {
        if (lastDigits.length < catalogerPatternLength + 10) return null;
        const chars = digitTradeMode === 'evenOdd' 
            ? lastDigits.map(d => d % 2 === 0 ? 'E' : 'O').reverse()
            : lastDigits.map(d => d > digitPrediction ? 'A' : 'B').reverse();
        const statsMap = new Map<string, { occurrences: number, wins: number, contractType: ContractType }>();
        for (let i = 0; i <= chars.length - catalogerPatternLength - 1; i++) {
            const pattern = chars.slice(i, i + catalogerPatternLength).join('');
            const outcome = chars[i + catalogerPatternLength];
            const type: ContractType = digitTradeMode === 'evenOdd' 
                ? (outcome === 'E' ? 'DIGITEVEN' : 'DIGITODD')
                : (outcome === 'A' ? 'DIGITOVER' : 'DIGITUNDER');
            const key = `${pattern}->${outcome}`;
            if (!statsMap.has(key)) statsMap.set(key, { occurrences: 0, wins: 0, contractType: type });
            const stats = statsMap.get(key)!;
            stats.occurrences++;
            stats.wins++;
        }
        const potentialTrades = Array.from(statsMap.entries()).map(([key, stats]) => {
            const [pattern] = key.split('->');
            return { pattern, contractType: stats.contractType, occurrences: stats.occurrences, winRate: (stats.wins / stats.occurrences) * 100 };
        });
        return potentialTrades
            .filter(t => t.occurrences >= catalogerMinOccurrences && t.winRate >= catalogerMinWinRate)
            .reduce((best: any, current) => (!best || current.winRate > best.winRate ? current : best), null);
    }, [lastDigits, digitTradeMode, digitPrediction, catalogerPatternLength, catalogerMinWinRate, catalogerMinOccurrences]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        martingaleLevel.current = 0;
        setVirtualLossStreak(0);
        setVirtualWinStreak(0);
        setIsWaitingForVirtualResult(false);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setVirtualLossStreak, setVirtualWinStreak, setIsWaitingForVirtualResult]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);
        setChartData(prev => [...prev, { time: new Date(tick.epoch * 1000).toLocaleTimeString('pt-BR', { hour12: false }), price: parseFloat(tick.quote) }].slice(-50));
    }, [setLastDigits, setLastTickEpoch, setChartData]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Conectado - ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                addLog(`Iniciando fluxo de dados seguro para: ${asset}`, 'INFO');
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    setActiveContract({ contract_id: data.buy.contract_id }); 
                    addLog(`Ordem executada: ${data.buy.contract_id}`, 'INFO');
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Falha na Entrada: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) {
                    setLastCompletedContract(poc);
                    if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id });
                }
            }
        }
    }, [addLog, setAccountBalance, setActiveContract, setTradeStatus, asset, processTickData]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const buyContract = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, stakeAmount: number, barrier: number) => {
        if (!isConnected) return;
        const stakeNum = parseFloat(stakeAmount.toFixed(2));
        const params: any = { amount: stakeNum, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);
        lastTradeDetails.current = { stake: stakeNum, strategyName, signalId, contractType, barrier };
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: stakeNum, parameters: params });
    }, [sendMessage, asset, setTradeStatus, isConnected]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number) => {
        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;
        if (isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        buyContract(contractType, strategyName, signalId, stakeToUse, barrier);
    }, [initialStake, martingaleFactor, buyContract, isMartingaleActive]);

    const getSignalType = (contract: ContractType): SignalType => contract === 'DIGITEVEN' ? 'EVEN' : contract === 'DIGITODD' ? 'ODD' : contract === 'DIGITOVER' ? 'OVER' : 'UNDER';

    const isMarketStable = useCallback(() => {
        if (!isStreakFilterActive) return true;
        const checkWindow = lastDigits.slice(0, 10);
        if (checkWindow.length < 3) return true;
        let currentStreak = 1;
        let currentType = digitTradeMode === 'evenOdd' ? (checkWindow[0] % 2 === 0 ? 'E' : 'O') : (checkWindow[0] > digitPrediction ? 'A' : 'B');
        for (let i = 1; i < checkWindow.length; i++) {
            const type = digitTradeMode === 'evenOdd' ? (checkWindow[i] % 2 === 0 ? 'E' : 'O') : (checkWindow[i] > digitPrediction ? 'A' : 'B');
            if (type === currentType) {
                currentStreak++;
                if (currentStreak > maxStreakAllowed) return false;
            } else {
                currentStreak = 1;
                currentType = type;
            }
        }
        return true;
    }, [lastDigits, isStreakFilterActive, maxStreakAllowed, digitTradeMode, digitPrediction]);

    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        
        if (isWaitingForVirtualResult && lastTradeDetails.current) {
            processedTickEpoch.current = lastTickEpoch;
            const currentDigit = lastDigits[0];
            const trade = lastTradeDetails.current;
            let isVirtualWin = false;
            if (trade.contractType === 'DIGITEVEN') isVirtualWin = currentDigit % 2 === 0;
            else if (trade.contractType === 'DIGITODD') isVirtualWin = currentDigit % 2 !== 0;
            else if (trade.contractType === 'DIGITOVER') isVirtualWin = currentDigit > (trade.barrier || 0);
            else if (trade.contractType === 'DIGITUNDER') isVirtualWin = currentDigit < (trade.barrier || 0);

            if (virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses) {
                if (isVirtualWin) {
                    setVirtualLossStreak(0); setVirtualWinStreak(0); setIsWaitingForVirtualResult(false);
                } else {
                    const nextLossStreak = virtualLossStreak + 1;
                    setVirtualLossStreak(nextLossStreak);
                    if (nextLossStreak >= virtualTargetLosses && virtualTargetWins === 0) {
                        isTradeOpen.current = true; setIsWaitingForVirtualResult(false); setVirtualLossStreak(0);
                        executeBuy(trade.contractType!, trade.strategyName, trade.signalId, trade.barrier || 0);
                    }
                }
                return;
            }
            if (virtualTargetWins > 0) {
                if (isVirtualWin) {
                    const nextWinStreak = virtualWinStreak + 1;
                    setVirtualWinStreak(nextWinStreak);
                    if (nextWinStreak >= virtualTargetWins) {
                        isTradeOpen.current = true; setVirtualLossStreak(0); setVirtualWinStreak(0); setIsWaitingForVirtualResult(false);
                        executeBuy(trade.contractType!, trade.strategyName, trade.signalId, trade.barrier || 0);
                    }
                } else {
                    setVirtualLossStreak(0); setVirtualWinStreak(0); setIsWaitingForVirtualResult(false);
                }
                return;
            }
        }

        processedTickEpoch.current = lastTickEpoch;

        let contract: ContractType | null = null;
        let strategyName = '';
        let barrier = digitPrediction;

        // LÓGICA PROBABILISTICA (TENDÊNCIA)
        if (activeStrategy === 'probabilistic') {
            // Se estamos no martingale e com reversão ativa, fazemos o GALE IMEDIATO
            if (martingaleLevel.current > 0 && reverseOnLoss && lastTradeDetails.current?.contractType) {
                const lastType = lastTradeDetails.current.contractType;
                if (lastType === 'DIGITEVEN') contract = 'DIGITODD';
                else if (lastType === 'DIGITODD') contract = 'DIGITEVEN';
                else if (lastType === 'DIGITOVER') contract = 'DIGITUNDER';
                else if (lastType === 'DIGITUNDER') contract = 'DIGITOVER';
                strategyName = "Prob: Fluxo Reverso";
            } else if (martingaleLevel.current === 0) {
                // Entrada a favor da tendência (O que mais saiu)
                if (!isMarketStable()) return;
                const window = lastDigits.slice(0, probWindow);
                if (window.length >= probWindow) {
                    const evens = window.filter(d => d % 2 === 0).length;
                    const odds = window.length - evens;
                    // AGORA: Aposta a favor da força (Trend Following)
                    contract = evens > odds ? 'DIGITEVEN' : 'DIGITODD';
                    strategyName = `Prob: Tendência ${probWindow}`;
                }
            }
        }
        else if (activeStrategy === 'neuralRico') {
            if (!isMarketStable()) return;
            const window = lastDigits.slice(0, neuralRicoWindow);
            if (window.length >= neuralRicoWindow) {
                const evens = window.filter(d => d % 2 === 0).length;
                const odds = window.length - evens;
                const evenPercent = (evens / window.length) * 100;
                const oddPercent = (odds / window.length) * 100;
                if (evenPercent >= neuralRicoThreshold) {
                    contract = 'DIGITODD'; strategyName = "ANR: Saturação Par";
                } else if (oddPercent >= neuralRicoThreshold) {
                    contract = 'DIGITEVEN'; strategyName = "ANR: Saturação Ímpar";
                } 
                else if (evenPercent >= 45 && evenPercent <= 55) {
                    const lastD = lastDigits[0];
                    contract = lastD % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD';
                    strategyName = "ANR: Fluxo";
                }
            }
        } else if (activeStrategy === 'smartAI' && smartAIAnalysis) {
            if (!isMarketStable()) return;
            const { pattern, contractType } = smartAIAnalysis;
            const currentPattern = digitTradeMode === 'evenOdd'
                ? lastDigits.slice(0, pattern.length).map(d => d % 2 === 0 ? 'E' : 'O').reverse().join('')
                : lastDigits.slice(0, pattern.length).map(d => d > digitPrediction ? 'A' : 'B').reverse().join('');
            if (currentPattern === pattern) {
                contract = contractType; strategyName = `IA: ${pattern}`;
            }
        } else if (activeStrategy === 'doubleOneTrigger' && isDoubleOneTriggerActive) {
            if (!isMarketStable()) return;
            const recent = lastDigits.slice(0, doubleOneTriggerCount);
            if (recent.length === doubleOneTriggerCount && recent.every(d => doubleOneTriggerTargetDigits.includes(d))) {
                contract = recent[0] % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD'; strategyName = "Gatilho";
            }
        }

        if (contract) {
            const sId = addSignal({ strategy: strategyName, signal: getSignalType(contract), details: 'Analise Probabilistica', winRate: '...' });
            setCurrentSignal(contract, { strategyName, winRate: 0, signalId: sId });
            if (virtualTargetLosses > 0 || virtualTargetWins > 0) {
                lastTradeDetails.current = { stake: 0, strategyName, signalId: sId, contractType: contract, barrier };
                setIsWaitingForVirtualResult(true); setVirtualLossStreak(0); setVirtualWinStreak(0);
            } else {
                isTradeOpen.current = true; executeBuy(contract, strategyName, sId, barrier);
            }
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, activeStrategy, smartAIAnalysis, digitTradeMode, digitPrediction, isDoubleOneTriggerActive, doubleOneTriggerCount, doubleOneTriggerTargetDigits, catalogerPatternLength, isWaitingForVirtualResult, virtualLossStreak, virtualWinStreak, virtualTargetLosses, virtualTargetWins, isMarketStable, neuralRicoWindow, neuralRicoThreshold, probWindow, reverseOnLoss]);

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
            if (isMartingaleActive && isBotRunning) martingaleLevel.current += 1;
            addLog(`LOSS REAL: $${Math.abs(parseFloat(profit)).toFixed(2)} (Gale nível ${martingaleLevel.current})`, 'LOSS', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        } else {
            setWins(prev => prev + 1); martingaleLevel.current = 0;
            addLog(`WIN REAL: $${parseFloat(profit).toFixed(2)}`, 'WIN', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        }
        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        isTradeOpen.current = false; setActiveContract(null); setTradeStatus('IDLE'); setLastCompletedContract(null);
        if (isBotRunning) {
            if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("META BATIDA!");
            else if (totalProfitRef.current <= -parseFloat(stopLoss)) stopBot("STOP LOSS!");
            else if (martingaleLevel.current > maxLevels) { martingaleLevel.current = 0; }
        }
    }, [lastCompletedContract, activeContract, isBotRunning, takeProfit, stopLoss, maxLevels, isMartingaleActive]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const handleDisconnect = useCallback(( ) => { disconnect(); stopBot("Desconectado"); }, [disconnect, stopBot]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Parado");
        else { setIsBotRunning(true); totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); martingaleLevel.current = 0; setVirtualLossStreak(0); setVirtualWinStreak(0); }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, manualBuy: () => {}, fetchClosedHistory, clearClosedHistory: () => setClosedHistory([]),
    }), [stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, fetchClosedHistory]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};