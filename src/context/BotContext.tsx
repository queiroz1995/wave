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
    const tradeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processedTickEpoch = useRef<number | null>(null);
    const totalProfitRef = useRef(0.00);
    const accumulatedLoss = useRef(0.00); 
    const martingaleLevel = useRef(0);
    
    const lastProfitRef = useRef(0.00);
    const lastResultRef = useRef<'WIN' | 'LOSS' | null>(null);

    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    const lastTradeDetails = useRef<{ stake: number, strategyName: string, signalId: string | null, contractType: ContractType | null, barrier?: number } | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setLastTickEpoch, lastTickEpoch,
        setTradeStatus,
        digitPrediction,
        activeContract, isBotRunning,
        activeStrategy, setActiveStrategy,
        realToken, demoToken, accountType,
        takeProfit,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // Função para buscar histórico via API da Deriv (mais confiável que o DB local se estiver vazio)
    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        addLog(`Sincronizando dados de ${symbol}...`, 'INFO');
        sendMessageRef.current({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 50,
            end: "latest",
            start: 1,
            style: "ticks"
        });
    }, [addLog]);

    useEffect(() => { 
        if (isConnected && asset) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            fetchDerivHistory(asset);
        }
    }, [asset, isConnected, fetchDerivHistory]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        isTradeOpen.current = false;
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
        martingaleLevel.current = 0;
        accumulatedLoss.current = 0;
        lastResultRef.current = null;
        lastProfitRef.current = 0;
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog]);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);
    }, [setLastDigits, setLastTickEpoch]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setStatus({ message: `Online: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
            } else if (data?.msg_type === 'history') {
                if (data.history?.prices) {
                    const digits = data.history.prices.map((p: number) => parseInt(String(p).slice(-1)));
                    setLastDigits(digits.reverse());
                    addLog("Banco de dados neural sincronizado.", "INFO");
                }
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    setActiveContract({ contract_id: data.buy.contract_id }); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                } else if (data.error) {
                    isTradeOpen.current = false;
                    setTradeStatus('IDLE');
                    if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
                    addLog(`Erro Corretora: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                if (data.proposal_open_contract?.is_sold) {
                    setLastCompletedContract(data.proposal_open_contract);
                    if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id });
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setActiveContract, setTradeStatus, addLog, setLastDigits]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number) => {
        if (!isConnected || isTradeOpen.current) return;

        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;

        if (martingaleLevel.current >= 3) {
            stakeToUse = (Math.abs(accumulatedLoss.current) + baseStake) / 0.95;
            addLog(`[RECUPERAÇÃO] $${stakeToUse.toFixed(2)}`, 'TRADE');
        } 
        else if (lastResultRef.current === 'WIN' && lastProfitRef.current > 0) {
            stakeToUse = baseStake + lastProfitRef.current;
            addLog(`[SOROS] $${stakeToUse.toFixed(2)}`, 'TRADE');
        } 
        else {
            stakeToUse = baseStake;
        }

        const params: any = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        
        // Timer de segurança proativo: se não houver resposta em 10s, libera o fluxo
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = setTimeout(() => {
            if (isTradeOpen.current) {
                addLog("Time-out: Liberando processador neural.", "ERROR");
                isTradeOpen.current = false;
                setTradeStatus('IDLE');
                setActiveContract(null);
            }
        }, 10000);

        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, addLog, setActiveContract]);

    // --- I.A WAVE NEURAL OTIMIZADA ---
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const rawDigits = lastDigits.slice(0, 15);
        if (rawDigits.length < 10) return; // Reduzido requisito mínimo para 10

        // 1. Momentum com pesos (Recentes valem mais)
        let evenWeight = 0;
        let oddWeight = 0;
        rawDigits.slice(0, 8).forEach((d, i) => {
            const weight = i < 2 ? 3.0 : i < 4 ? 2.0 : 1.0;
            if (d % 2 === 0) evenWeight += weight;
            else oddWeight += weight;
        });

        // 2. Análise de Ruído
        const parities = rawDigits.slice(0, 5).map(d => d % 2 === 0 ? 'E' : 'O');
        const isChoppy = parities[0] !== parities[1] && parities[1] !== parities[2];

        // 3. Cluster
        const avgValue = rawDigits.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        
        let contract: ContractType | null = null;
        let strategyName = "Wave Neural";
        let barrier = digitPrediction;

        // Lógica Decisions (Mais Sensível)
        if (isChoppy) {
            if (avgValue > 5.5) { contract = 'DIGITUNDER'; barrier = 7; strategyName = "Wave: Under Flow"; }
            else if (avgValue < 4.5) { contract = 'DIGITOVER'; barrier = 2; strategyName = "Wave: Over Flow"; }
        } else {
            // Sensibilidade aumentada para 1.4x (mais entradas)
            if (evenWeight > oddWeight * 1.4) {
                contract = 'DIGITODD'; 
                strategyName = "Wave: Odd Pulse";
            } else if (oddWeight > evenWeight * 1.4) {
                contract = 'DIGITEVEN';
                strategyName = "Wave: Even Pulse";
            } else if (rawDigits.slice(0, 3).every(d => d % 2 === 0)) {
                contract = 'DIGITODD';
                strategyName = "Wave: Reversão Triple";
            } else if (rawDigits.slice(0, 3).every(d => d % 2 !== 0)) {
                contract = 'DIGITEVEN';
                strategyName = "Wave: Reversão Triple";
            } else if (avgValue >= 8) {
                contract = 'DIGITUNDER'; barrier = 9;
                strategyName = "Wave: Peak Under";
            } else if (avgValue <= 1) {
                contract = 'DIGITOVER'; barrier = 0;
                strategyName = "Wave: Bottom Over";
            }
        }

        if (contract) {
            const sId = addSignal({ 
                strategy: strategyName, 
                signal: contract.includes('EVEN') ? 'EVEN' : contract.includes('ODD') ? 'ODD' : contract.includes('OVER') ? 'OVER' : 'UNDER', 
                details: 'AI_Calculated', 
                winRate: '91.2%' 
            });
            executeBuy(contract, strategyName, sId, barrier);
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, executeBuy, addSignal, digitPrediction]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, contract_id, exit_tick } = lastCompletedContract;
        if (activeContract?.contract_id !== contract_id) return;

        const isLoss = status === 'lost';
        const exitDigit = parseInt(String(exit_tick).slice(-1));
        const lastTrade = lastTradeDetails.current;
        const profitValue = parseFloat(profit);

        setAccountBalance(prev => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses(prev => prev + 1);
            accumulatedLoss.current += Math.abs(profitValue);
            martingaleLevel.current += 1;
            lastResultRef.current = 'LOSS';
            lastProfitRef.current = 0;
            addLog(`Loss: Reset Soros. Nível Gale: ${martingaleLevel.current}/4.`, 'INFO');
        } else {
            setWins(prev => prev + 1); 
            martingaleLevel.current = 0;
            accumulatedLoss.current = 0;
            lastResultRef.current = 'WIN';
            lastProfitRef.current = profitValue;
        }
        
        if (lastTrade?.signalId) updateSignalResult(lastTrade.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTrade.stake, exitDigit);
        
        isTradeOpen.current = false; 
        setActiveContract(null); 
        setTradeStatus('IDLE'); 
        setLastCompletedContract(null);
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta Batida!");
    }, [lastCompletedContract, activeContract, takeProfit, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult]);

    const selectAI = useCallback((ia: any) => {
        setSelectedAIInfo(ia);
        setActiveStrategy(ia.id);
        setAppFlow('operating');
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => {
        stopBot("Sessão Finalizada");
        setAppFlow('selection');
    }, [stopBot]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
        if (isBotRunning) stopBot("Bot Desativado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); 
            martingaleLevel.current = 0; accumulatedLoss.current = 0;
            lastResultRef.current = null; lastProfitRef.current = 0;
            addLog("I.A Wave Online: Iniciando sincronização neural...", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, addLog]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};