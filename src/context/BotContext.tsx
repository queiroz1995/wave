"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';

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
    
    // Virtual Engine Refs
    const virtualLossStreakRef = useRef(0);
    const lastVirtualSignalRef = useRef<{ contract: ContractType, barrier: number } | null>(null);

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
        activeContract, isBotRunning,
        setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit,
        virtualTargetLosses,
        setVirtualLossStreak
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        addLog(`Sincronizando fluxo neural...`, 'INFO');
        sendMessageRef.current({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 100,
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
        virtualLossStreakRef.current = 0;
        setVirtualLossStreak(0);
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setVirtualLossStreak]);

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
                    addLog(`Erro: ${data.error.message}`, "ERROR");
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                if (data.proposal_open_contract?.is_sold) {
                    setLastCompletedContract(data.proposal_open_contract);
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

        if (martingaleLevel.current > 0) {
            stakeToUse = (Math.abs(accumulatedLoss.current) + (baseStake * 2)) / 0.94;
        } 

        const params: any = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: asset };
        if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') params.barrier = String(barrier);

        lastTradeDetails.current = { stake: stakeToUse, strategyName, signalId, contractType, barrier };
        isTradeOpen.current = true;
        setTradeStatus('SENDING');
        
        if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = setTimeout(() => {
            if (isTradeOpen.current) {
                isTradeOpen.current = false;
                setTradeStatus('IDLE');
            }
        }, 8000);

        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus]);

    // --- MOTOR VORTEX HUNTER COM FILTRO VIRTUAL ---
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const rawDigits = lastDigits.slice(0, 15);
        if (rawDigits.length < 5) return;

        const currentDigit = rawDigits[0];
        
        // 1. Processar Resultado Virtual do Sinal Anterior
        if (lastVirtualSignalRef.current) {
            const { contract, barrier } = lastVirtualSignalRef.current;
            let isWin = false;
            if (contract === 'DIGITEVEN') isWin = currentDigit % 2 === 0;
            else if (contract === 'DIGITODD') isWin = currentDigit % 2 !== 0;
            else if (contract === 'DIGITOVER') isWin = currentDigit > barrier;
            else if (contract === 'DIGITUNDER') isWin = currentDigit < barrier;

            if (isWin) {
                virtualLossStreakRef.current = 0;
            } else {
                virtualLossStreakRef.current += 1;
                addLog(`Filtro: ${virtualLossStreakRef.current}/${virtualTargetLosses} Loss Virtual Detectado.`, 'INFO');
            }
            setVirtualLossStreak(virtualLossStreakRef.current);
            lastVirtualSignalRef.current = null;
        }

        // 2. Lógica de Decisão (Geração de Sinal)
        const lastTwo = rawDigits.slice(0, 2);
        let contract: ContractType | null = null;
        let strategyName = "Vortex Hunter";
        let barrier = 0;

        if (lastTwo[0] % 2 === 0 && lastTwo[1] % 2 === 0) {
            contract = 'DIGITEVEN'; strategyName = "VORTEX: Trend Even";
        } else if (lastTwo[0] % 2 !== 0 && lastTwo[1] % 2 !== 0) {
            contract = 'DIGITODD'; strategyName = "VORTEX: Trend Odd";
        } else if (lastTwo[0] % 2 !== lastTwo[1] % 2) {
            contract = lastTwo[0] % 2 === 0 ? 'DIGITODD' : 'DIGITEVEN';
            strategyName = "VORTEX: Cycle Break";
        }

        if (!contract) {
            if (lastTwo[0] >= 8) { contract = 'DIGITUNDER'; barrier = 7; strategyName = "VORTEX: Under Attack"; }
            else if (lastTwo[0] <= 1) { contract = 'DIGITOVER'; barrier = 2; strategyName = "VORTEX: Over Attack"; }
        }

        // 3. Execução (Real ou Virtual)
        if (contract) {
            const isInMartingale = martingaleLevel.current > 0;
            
            if (virtualLossStreakRef.current >= virtualTargetLosses || isInMartingale) {
                // ENTRADA REAL
                const sId = addSignal({ 
                    strategy: strategyName, 
                    signal: contract.includes('EVEN') ? 'EVEN' : contract.includes('ODD') ? 'ODD' : contract.includes('OVER') ? 'OVER' : 'UNDER', 
                    details: isInMartingale ? 'GALE IMEDIATO' : 'ALVO CONFIRMADO', 
                    winRate: '99%' 
                });
                executeBuy(contract, strategyName, sId, barrier);
                // O reset do virtual streak acontece após o resultado do trade real
            } else {
                // AGUARDAR FILTRO (Salva como virtual para checar no próximo tick)
                lastVirtualSignalRef.current = { contract, barrier };
            }
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, executeBuy, addSignal, virtualTargetLosses, addLog, setVirtualLossStreak]);

    useEffect(() => {
        if (!lastCompletedContract) return;
        const { profit, status, contract_id, exit_tick } = lastCompletedContract;
        if (activeContract?.contract_id !== contract_id) return;

        const isLoss = status === 'lost';
        const profitValue = parseFloat(profit);
        const exitDigit = parseInt(String(exit_tick).slice(-1));

        setAccountBalance(prev => prev !== null ? prev + profitValue : null);
        totalProfitRef.current += profitValue;
        setTotalProfit(totalProfitRef.current);

        if (isLoss) {
            setLosses(prev => prev + 1);
            accumulatedLoss.current += Math.abs(profitValue);
            martingaleLevel.current += 1;
            
            if (martingaleLevel.current >= 2) {
                addLog(`CRÍTICO: 2 Loss Consecutivos. Resetando para Stake Inicial.`, 'ERROR');
                martingaleLevel.current = 0;
                accumulatedLoss.current = 0;
                virtualLossStreakRef.current = 0; // Reset virtual ao desistir do ciclo
                setVirtualLossStreak(0);
            } else {
                addLog(`Red Detectado. Iniciando Gale Imediato...`, 'ERROR');
            }
        } else {
            setWins(prev => prev + 1); 
            martingaleLevel.current = 0;
            accumulatedLoss.current = 0;
            virtualLossStreakRef.current = 0; // Ganhou no real, volta pro filtro
            setVirtualLossStreak(0);
            if (lastTradeDetails.current?.stake && lastTradeDetails.current.stake > (parseFloat(initialStake) || 0.35)) {
                addLog("Gale Finalizado com Sucesso!", "WIN");
            }
        }
        
        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }
        
        isTradeOpen.current = false; 
        setActiveContract(null); 
        setTradeStatus('IDLE'); 
        setLastCompletedContract(null);

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta de Lucro Alcançada!");
    }, [lastCompletedContract, activeContract, takeProfit, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult, addLog, initialStake, setVirtualLossStreak]);

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
        if (isBotRunning) stopBot("Sessão Interrompida");
        else { 
            setIsBotRunning(true); 
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0); 
            martingaleLevel.current = 0; accumulatedLoss.current = 0;
            virtualLossStreakRef.current = 0;
            setVirtualLossStreak(0);
            addLog("Vortex Hunter: Filtro Virtual de 4 Loss Ativado.", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, addLog, setVirtualLossStreak]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};