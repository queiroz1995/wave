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
    const tickSubscriptionId = useRef<string | null>(null);
    const contractSubscriptionId = useRef<string | null>(null);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setChartData, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, duration, initialStake, addSignal, updateSignalResult,
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
        catalogerPatternLength, catalogerMinWinRate, catalogerMartingaleLevels, catalogerMinOccurrences,
        isDoubleOneTriggerActive, doubleOneTriggerCount, doubleOneTriggerTargetDigits,
        isMartingaleActive,
        virtualLossStreak, setVirtualLossStreak,
        isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        virtualTargetLosses, setVirtualTargetLosses, // ADICIONADO AQUI
        // NOVOS ESTADOS
        isStreakFilterActive, maxStreakAllowed,
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
        setIsWaitingForVirtualResult(false);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setVirtualLossStreak, setIsWaitingForVirtualResult]);

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
        
        // Aplica Martingale se o nível for maior que zero
        if (isMartingaleActive && martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(parseFloat(martingaleFactor) || 2.2, martingaleLevel.current);
        }
        
        buyContract(contractType, strategyName, signalId, stakeToUse, barrier);
    }, [initialStake, martingaleFactor, buyContract, isMartingaleActive]);

    const getSignalType = (contract: ContractType): SignalType => contract === 'DIGITEVEN' ? 'EVEN' : contract === 'DIGITODD' ? 'ODD' : contract === 'DIGITOVER' ? 'OVER' : 'UNDER';

    // FUNÇÃO AUXILIAR: VERIFICA ESTABILIDADE DO MERCADO
    const isMarketStable = useCallback(() => {
        if (!isStreakFilterActive) return true;
        // Analisa os últimos 10 dígitos para ver se existe alguma sequência maior que a permitida
        const checkWindow = lastDigits.slice(0, 10);
        if (checkWindow.length < 3) return true;

        let currentStreak = 1;
        let currentType = digitTradeMode === 'evenOdd' 
            ? (checkWindow[0] % 2 === 0 ? 'E' : 'O')
            : (checkWindow[0] > digitPrediction ? 'A' : 'B');

        for (let i = 1; i < checkWindow.length; i++) {
            const type = digitTradeMode === 'evenOdd' 
                ? (checkWindow[i] % 2 === 0 ? 'E' : 'O')
                : (checkWindow[i] > digitPrediction ? 'A' : 'B');
            
            if (type === currentType) {
                currentStreak++;
                if (currentStreak > maxStreakAllowed) return false; // Bloqueia se a sequência for muito longa
            } else {
                currentStreak = 1;
                currentType = type;
            }
        }
        return true;
    }, [lastDigits, isStreakFilterActive, maxStreakAllowed, digitTradeMode, digitPrediction]);

    // LÓGICA DE EXECUÇÃO: IMEDIATA E SEQUENCIAL
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        
        // FASE 2: ANALISANDO A SEQUÊNCIA DE LOSSES (IMEDIATA)
        if (isWaitingForVirtualResult && lastTradeDetails.current) {
            processedTickEpoch.current = lastTickEpoch;
            const currentDigit = lastDigits[0];
            const trade = lastTradeDetails.current;
            let isVirtualWin = false;

            if (trade.contractType === 'DIGITEVEN') isVirtualWin = currentDigit % 2 === 0;
            else if (trade.contractType === 'DIGITODD') isVirtualWin = currentDigit % 2 !== 0;
            else if (trade.contractType === 'DIGITOVER') isVirtualWin = currentDigit > (trade.barrier || 0);
            else if (trade.contractType === 'DIGITUNDER') isVirtualWin = currentDigit < (trade.barrier || 0);

            if (isVirtualWin) {
                // Se der WIN no meio da sequência, reseta tudo e busca novo padrão
                addLog(`Win Virtual no dígito ${currentDigit}. Sequência interrompida.`, 'INFO');
                setVirtualLossStreak(0);
                setIsWaitingForVirtualResult(false);
            } else {
                // Se der LOSS, incrementa e continua analisando IMEDIATAMENTE o próximo tick
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                addLog(`Loss Virtual ${nextStreak}/${virtualTargetLosses} (Dígito ${currentDigit})`, 'ERROR');
                
                if (nextStreak >= virtualTargetLosses) {
                    addLog("Sequência de Filtro atingida! EXECUTANDO ENTRADA REAL COM GALE ACUMULADO.", 'TRADE');
                    isTradeOpen.current = true;
                    setVirtualLossStreak(0);
                    setIsWaitingForVirtualResult(false);
                    // Aqui ele executa a entrada real usando o martingaleLevel.current acumulado
                    executeBuy(trade.contractType!, trade.strategyName, trade.signalId, trade.barrier || 0);
                }
            }
            return;
        }

        // FASE 1: BUSCANDO O PADRÃO INICIAL
        if (lastDigits.length < catalogerPatternLength) return;
        processedTickEpoch.current = lastTickEpoch;

        // FILTRO DE ZIGUE-ZAGUE (ESTABILIDADE)
        if (!isMarketStable()) return;

        let contract: ContractType | null = null;
        let strategyName = '';
        let barrier = digitPrediction;

        if (activeStrategy === 'smartAI' && smartAIAnalysis) {
            const { pattern, contractType } = smartAIAnalysis;
            const currentPattern = digitTradeMode === 'evenOdd'
                ? lastDigits.slice(0, pattern.length).map(d => d % 2 === 0 ? 'E' : 'O').reverse().join('')
                : lastDigits.slice(0, pattern.length).map(d => d > digitPrediction ? 'A' : 'B').reverse().join('');
            if (currentPattern === pattern) {
                contract = contractType;
                strategyName = `IA: ${pattern}`;
            }
        } else if (activeStrategy === 'doubleOneTrigger' && isDoubleOneTriggerActive) {
            const recent = lastDigits.slice(0, doubleOneTriggerCount);
            if (recent.length === doubleOneTriggerCount && recent.every(d => doubleOneTriggerTargetDigits.includes(d))) {
                contract = recent[0] % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD';
                strategyName = "Gatilho";
            }
        }

        if (contract) {
            const sId = addSignal({ strategy: strategyName, signal: getSignalType(contract), details: 'Análise Sequencial', winRate: '...' });
            setCurrentSignal(contract, { strategyName, winRate: 0, signalId: sId });
            
            // ATIVA IMEDIATAMENTE A ESPERA PELOS PRÓXIMOS DÍGITOS
            lastTradeDetails.current = { stake: 0, strategyName, signalId: sId, contractType: contract, barrier };
            setIsWaitingForVirtualResult(true);
            setVirtualLossStreak(0);
            addLog(`Padrão Detectado. Aguardando ${virtualTargetLosses} losses virtuais para entrar...`, 'INFO');
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, activeStrategy, smartAIAnalysis, digitTradeMode, digitPrediction, isDoubleOneTriggerActive, doubleOneTriggerCount, doubleOneTriggerTargetDigits, catalogerPatternLength, isWaitingForVirtualResult, virtualLossStreak, virtualTargetLosses, isMarketStable]);

    // Resultados Reais
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
            // Se perdeu no real, aumenta o nível do gale para a próxima entrada real (após o filtro)
            if (isMartingaleActive && isBotRunning) martingaleLevel.current += 1;
            addLog(`LOSS REAL: $${Math.abs(parseFloat(profit)).toFixed(2)} (Gale nível ${martingaleLevel.current})`, 'LOSS', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        } else {
            setWins(prev => prev + 1);
            // Se ganhou no real, reseta o gale
            martingaleLevel.current = 0;
            addLog(`WIN REAL: $${parseFloat(profit).toFixed(2)}`, 'WIN', { profit: parseFloat(profit), strategyName: lastTrade?.strategyName, exitDigit });
        }
        
        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', parseFloat(profit), lastTrade.stake, exitDigit);
        isTradeOpen.current = false; setActiveContract(null); setTradeStatus('IDLE'); setLastCompletedContract(null);
        
        if (isBotRunning) {
            if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("META BATIDA!");
            else if (totalProfitRef.current <= -parseFloat(stopLoss)) stopBot("STOP LOSS!");
            else if (martingaleLevel.current > maxLevels) { 
                addLog("Limite de Gale Real atingido. Resetando nível.", "ERROR"); 
                martingaleLevel.current = 0; 
            }
        }
    }, [lastCompletedContract, activeContract, isBotRunning, takeProfit, stopLoss, maxLevels, isMartingaleActive]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const handleDisconnect = useCallback(() => {
        disconnect(); stopBot("Desconectado");
    }, [disconnect, stopBot]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Parado");
        else { setIsBotRunning(true); totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); martingaleLevel.current = 0; setVirtualLossStreak(0); }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, manualBuy: () => {}, fetchClosedHistory, clearClosedHistory: () => setClosedHistory([]),
    }), [stateAndSetters, isConnected, status, handleConnect, handleDisconnect, toggleBot, fetchClosedHistory]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};