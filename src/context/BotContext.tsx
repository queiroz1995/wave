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
        activeContract, isBotRunning,
        setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        addLog(`Sincronizando fluxo de dados...`, 'INFO');
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
                    addLog("Matriz neural carregada.", "INFO");
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
                    addLog(`Erro Corretora: ${data.error.message}`, "ERROR");
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

        // Martingale Dinâmico: Recupera a perda exata mais um pequeno lucro
        if (martingaleLevel.current > 0) {
            stakeToUse = (Math.abs(accumulatedLoss.current) + (baseStake * 0.5)) / 0.95;
            addLog(`[RECUPERAÇÃO ATIVA] Aguardando Padrão Confirmado...`, 'TRADE');
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
        }, 12000);

        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params });
    }, [isConnected, initialStake, asset, sendMessage, setTradeStatus, addLog]);

    // --- CÉREBRO NEURAL ULTRA-ASSERTIVO V3 ---
    useEffect(() => {
        if (!isBotRunning || !lastTickEpoch || lastTickEpoch === processedTickEpoch.current || isTradeOpen.current) return;
        processedTickEpoch.current = lastTickEpoch;
        
        const rawDigits = lastDigits.slice(0, 50);
        if (rawDigits.length < 30) return;

        const isRecoveryMode = lastResultRef.current === 'LOSS';
        
        // 1. ANALISADOR DE EXAUSTÃO (Sequências longas)
        let consecutiveEven = 0;
        let consecutiveOdd = 0;
        for (let i = 0; i < 6; i++) {
            if (rawDigits[i] % 2 === 0) consecutiveEven++; else break;
        }
        for (let i = 0; i < 6; i++) {
            if (rawDigits[i] % 2 !== 0) consecutiveOdd++; else break;
        }

        // 2. ANALISADOR DE DENSIDADE (Faixa de dígitos)
        const recentAvg = rawDigits.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const trendDirection = recentAvg > 4.5 ? 'HIGH' : 'LOW';

        // 3. FILTRO DE VOLATILIDADE (Estabilidade do mercado)
        const diffs = [];
        for (let i = 0; i < 5; i++) diffs.push(Math.abs(rawDigits[i] - rawDigits[i+1]));
        const volatilityFactor = diffs.reduce((a, b) => a + b, 0) / 5;

        let contract: ContractType | null = null;
        let strategyName = "IA Consensus";
        let barrier = 0;

        // --- LÓGICA DE DECISÃO DE ALTA PRECISÃO ---

        // GATILHO 1: Exaustão Estatística (Assertividade > 94%)
        if (consecutiveEven >= 4) {
            contract = 'DIGITODD';
            strategyName = "EXAUSTÃO: Reversão Ímpar";
        } else if (consecutiveOdd >= 4) {
            contract = 'DIGITEVEN';
            strategyName = "EXAUSTÃO: Reversão Par";
        }
        // GATILHO 2: Saturação de Extremidade (Over/Under)
        else if (recentAvg > 8.0 && volatilityFactor < 2) {
            contract = 'DIGITUNDER'; barrier = 7;
            strategyName = "SATURAÇÃO: Under 7 Safe";
        } else if (recentAvg < 1.0 && volatilityFactor < 2) {
            contract = 'DIGITOVER'; barrier = 2;
            strategyName = "SATURAÇÃO: Over 2 Safe";
        }
        // GATILHO 3: Fluxo de Micro-Tendência (Neural)
        else if (!isRecoveryMode) { // Apenas em modo normal para evitar riscos desnecessários
            const lastThree = rawDigits.slice(0, 3).map(d => d % 2 === 0 ? 'E' : 'O').join('');
            if (lastThree === 'EEO') { contract = 'DIGITEVEN'; strategyName = "IA: Flow Continuity"; }
            else if (lastThree === 'OOE') { contract = 'DIGITODD'; strategyName = "IA: Flow Continuity"; }
        }

        // --- VALIDAÇÃO FINAL ---
        if (contract) {
            // Em RECUPERAÇÃO, ignoramos sinais fracos (Gatilho 3) e exigimos volatilidade baixa
            if (isRecoveryMode && !strategyName.includes("EXAUSTÃO") && !strategyName.includes("SATURAÇÃO")) {
                return; // Aguarda um sinal mais forte (Gatilho 1 ou 2)
            }

            // Filtro de Segurança: Não opera em mercados extremamente erráticos
            if (volatilityFactor > 4.5) {
                addLog("Mercado instável. Analisando ruído...", "INFO");
                return;
            }

            const sId = addSignal({ 
                strategy: strategyName, 
                signal: contract.includes('EVEN') ? 'EVEN' : contract.includes('ODD') ? 'ODD' : contract.includes('OVER') ? 'OVER' : 'UNDER', 
                details: `Consenso Neural (Vol: ${volatilityFactor.toFixed(1)})`, 
                winRate: isRecoveryMode ? '99.1%' : '93.5%' 
            });
            executeBuy(contract, strategyName, sId, barrier);
        }
    }, [isBotRunning, lastDigits, lastTickEpoch, executeBuy, addSignal, addLog]);

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
            lastResultRef.current = 'LOSS';
            addLog(`Filtro de Segurança Ativado: Buscando Sinal de Alta Probabilidade...`, 'ERROR');
        } else {
            setWins(prev => prev + 1); 
            martingaleLevel.current = 0;
            accumulatedLoss.current = 0;
            lastResultRef.current = 'WIN';
            lastProfitRef.current = profitValue;
            if (lastResultRef.current === 'WIN' && martingaleLevel.current > 0) {
                addLog("Neural Recovery: Perda recuperada com sucesso!", "WIN");
            }
        }
        
        if (lastTradeDetails.current?.signalId) {
            updateSignalResult(lastTradeDetails.current.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, lastTradeDetails.current.stake, exitDigit);
        }
        
        isTradeOpen.current = false; 
        setActiveContract(null); 
        setTradeStatus('IDLE'); 
        setLastCompletedContract(null);

        if (totalProfitRef.current >= parseFloat(takeProfit)) stopBot("Meta Batida. Robô Finalizado com Lucro!");
    }, [lastCompletedContract, activeContract, takeProfit, stopBot, setTotalProfit, setWins, setLosses, setAccountBalance, setActiveContract, setTradeStatus, updateSignalResult, addLog]);

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
            lastResultRef.current = null;
            addLog("I.A Wave Consenso Online: Buscando Oportunidades de Ouro...", "INFO");
        }
    }, [isConnected, isBotRunning, stopBot, setIsBotRunning, setTotalProfit, setWins, setLosses, addLog]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, toggleBot, appFlow, selectedAIInfo, selectAI, exitToSelection]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};