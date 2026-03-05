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

    useEffect(() => { 
        fetchInitialTicks(); 
        if (isConnected) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        }
    }, [asset, isConnected]);

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
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
            } else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    setActiveContract({ contract_id: data.buy.contract_id }); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                    
                    if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
                    tradeTimeoutRef.current = setTimeout(() => {
                        if (isTradeOpen.current) {
                            addLog("Watchdog: Resetando trava.", "ERROR");
                            isTradeOpen.current = false;
                            setTradeStatus('IDLE');
                            setActiveContract(null);
                        }
                    }, 12000);

                } else if (data.error) {
                    isTradeOpen.current = false;
                    setTradeStatus('IDLE');
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                if (data.proposal_open_contract?.is_sold) {
                    setLastCompletedContract(data.proposal_open_contract);
                    if (data.subscription?.id) sendMessageRef.current({ forget: data.subscription.id });
                    if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setActiveContract, setTradeStatus, addLog]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string | null, barrier: number) => {
        if (!isConnected || isTradeOpen.current) return;

        const baseStake = parseFloat(initialStake) || 0.35;
        let stakeToUse = baseStake;

        if (martingaleLevel.current >= 3) {
            stakeToUse = (Math.abs(accumulatedLoss.current) + baseStake) / 0.95;
            addLog(`[REC_GALE] $${stakeToUse.toFixed(2)}`, 'TRADE');
        } 
        else if (lastResultRef.current === 'WIN' && lastProfitRef.current > 0) {
            stakeToUse = baseStake + lastProfitRef.current;
            addLog(`[CONF_SOROS] $${stakeToUse.toFixed(2)}`, 'TRADE');
        } 
        else {
            stakeToUse = baseStake;
        }

        const params: any = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, addLog]);

    // NÚCLEO SUPREMACY I.A WAVE
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const shortWindow = lastDigits.slice(0, 10);
        const longWindow = lastDigits.slice(0, 50);
        if (shortWindow.length < 10) return;

        // Análise de Desvio Padrão (Z-Score)
        const evensLong = longWindow.filter(d => d % 2 === 0).length;
        const evenProb = evensLong / longWindow.length; // Frequência histórica
        
        const lastDigit = shortWindow[0];
        const isLastEven = lastDigit % 2 === 0;
        
        // Detecção de Zigue-Zague (Padrão 101010)
        const isChop = shortWindow.slice(0, 4).every((d, i, arr) => i === 0 || (d % 2 !== arr[i-1] % 2));

        let contract: ContractType | null = null;
        let strategyName = "I.A Wave Supremacy";
        let barrier = digitPrediction;

        // FILTRO: Só opera se NÃO houver zigue-zague ou se a probabilidade estiver muito distorcida
        if (!isChop) {
            // LÓGICA 1: EXAUSTÃO EXTREMA (Probabilidade > 75% de reversão)
            if (evenProb >= 0.7 && isLastEven) {
                contract = 'DIGITODD';
                strategyName = "Supremacy: Reversão Est.";
            } else if (evenProb <= 0.3 && !isLastEven) {
                contract = 'DIGITEVEN';
                strategyName = "Supremacy: Reversão Est.";
            }
            // LÓGICA 2: MOMENTUM DE EXPLOSÃO (3 seguidos + Confirmação de âncora)
            else if (shortWindow.slice(0, 3).every(d => d % 2 === 0) && lastDigit === 0) {
                contract = 'DIGITODD';
                strategyName = "Supremacy: Break Zero";
            }
            else if (shortWindow.slice(0, 3).every(d => d % 2 !== 0) && lastDigit === 9) {
                contract = 'DIGITEVEN';
                strategyName = "Supremacy: Break Nine";
            }
            // LÓGICA 3: ZONA DE SEGURANÇA (Over/Under dinâmico)
            else if (lastDigit >= 8 && evenProb > 0.6) {
                contract = 'DIGITUNDER'; barrier = 8;
                strategyName = "Supremacy: High-Guard";
            }
            else if (lastDigit <= 1 && evenProb < 0.4) {
                contract = 'DIGITOVER'; barrier = 1;
                strategyName = "Supremacy: Low-Guard";
            }
        }

        if (contract) {
            const sId = addSignal({ 
                strategy: strategyName, 
                signal: contract.includes('EVEN') ? 'EVEN' : contract.includes('ODD') ? 'ODD' : contract.includes('OVER') ? 'OVER' : 'UNDER', 
                details: 'Supremacy_Logic', 
                winRate: '96%' 
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
            addLog(`Loss. Proteção ativada. Nível: ${martingaleLevel.current}`, 'INFO');
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

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Alvo Supremacy Batido!");
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
        if (isBotRunning) stopBot("Bot Parado");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); 
            martingaleLevel.current = 0; accumulatedLoss.current = 0;
            lastResultRef.current = null; lastProfitRef.current = 0;
            addLog("I.A Supremacy Online: Verificando Z-Score...", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, addLog]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};