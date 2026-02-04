"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { toast } from 'sonner';

const BotContext = createContext<any>(undefined);

export const useBotContext = () => {
    const context = useContext(BotContext);
    if (!context) throw new Error('useBotContext must be used within a BotProvider');
    return context;
};

export const BotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const stateAndSetters = useBotState();
    useBotPersistence(stateAndSetters);

    const totalProfitRef = useRef(0.00);
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const currentAssetRef = useRef<string>('');
    const lastDigitsRef = useRef<number[]>([]);
    const lastProcessedRoundRef = useRef<number>(0);
    const hasTradedCurrentRoundRef = useRef<boolean>(false);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake,
        lastDigits,
        isBotRunning,
        accountType, realToken, demoToken,
        isRouletteMode, setRouletteTimer,
        setIsRouletteSpinning,
        setRouletteHistory,
        rouletteHistory,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        setLastSelectedRouletteNumbers,
        lastRouletteResult, setLastRouletteResult,
        addSignal, updateSignalResult,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    useEffect(() => {
        lastDigitsRef.current = lastDigits;
    }, [lastDigits]);

    // 1. EXECUÇÃO DE APOSTAS
    const executeTrade = useCallback((prediction: number, stake: number) => {
        if (!isConnected) return;

        const signalId = addSignal({
            strategy: "Roleta",
            signal: "ODD", 
            details: `Aposta Número ${prediction}`,
            stake: stake
        });

        sendMessageRef.current({
            buy: 1,
            price: stake,
            subscribe: 1,
            parameters: {
                amount: stake,
                basis: 'stake',
                contract_type: 'DIGITMATCH',
                currency: 'USD',
                duration: 1,
                duration_unit: 't',
                symbol: asset,
                barrier: String(prediction)
            },
            passthrough: { signalId }
        });
    }, [isConnected, asset, addSignal]);

    // 2. PROCESSAMENTO DO RESULTADO
    const processRouletteResult = useCallback(async (roundId: number) => {
        if (lastProcessedRoundRef.current >= roundId) return;
        lastProcessedRoundRef.current = roundId;

        const resultDigit = lastDigitsRef.current[0];
        if (resultDigit === undefined) return;

        setLastRouletteResult(resultDigit);
        setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 100));
        
        const currentBets = selectedRouletteNumbers;
        
        if (currentBets.length > 0) {
            const stakePerNumber = parseFloat(initialStake);
            const isWinner = currentBets.includes(resultDigit);
            
            if (isWinner) {
                const profit = stakePerNumber * 8; 
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);
                setWins(prev => prev + 1);
                addLog(`VITÓRIA! O número foi ${resultDigit}`, "WIN", { profit, strategyName: "Roleta" });
                toast.success(`VITÓRIA! O número foi ${resultDigit}`, { duration: 5000 });
            } else {
                const totalLost = stakePerNumber * currentBets.length;
                totalProfitRef.current -= totalLost;
                setTotalProfit(totalProfitRef.current);
                setLosses(prev => prev + 1);
                addLog(`DERROTA. O número foi ${resultDigit}`, "LOSS", { profit: -totalLost, strategyName: "Roleta" });
            }

            setLastSelectedRouletteNumbers([...currentBets]);
            setSelectedRouletteNumbers([]); 
        }
        hasTradedCurrentRoundRef.current = false;
    }, [selectedRouletteNumbers, initialStake, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers, addLog, setRouletteHistory, setLastRouletteResult]);

    // 3. CRONÔMETRO CENTRALIZADO
    useEffect(() => {
        if (!isRouletteMode) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const cycleMs = 16000;
            const elapsed = now % cycleMs;
            const remaining = Math.ceil((cycleMs - elapsed) / 1000);
            const currentRoundId = Math.floor(now / cycleMs);

            setRouletteTimer(remaining === 0 ? 16 : remaining);

            if (remaining <= 4 && remaining >= 1) {
                setIsRouletteSpinning(true);
            } else {
                setIsRouletteSpinning(false);
            }

            if (remaining === 5 && !hasTradedCurrentRoundRef.current) {
                if (isConnected && selectedRouletteNumbers.length > 0) {
                    const stakePerNumber = parseFloat(initialStake);
                    selectedRouletteNumbers.forEach(num => executeTrade(num, stakePerNumber));
                    hasTradedCurrentRoundRef.current = true;
                }
            }

            if (remaining === 11) {
                setLastRouletteResult(null);
            }

            if (remaining === 16) {
                processRouletteResult(currentRoundId - 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRouletteMode, isConnected, selectedRouletteNumbers, initialStake, executeTrade, processRouletteResult, setRouletteTimer, setIsRouletteSpinning, setLastRouletteResult]);

    // 4. WEBSOCKET FEED
    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        } else if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ 
                    message: `Conectado: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, 
                    color: 'bg-green-500' 
                });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
                addLog(`Conta ${data.authorize.is_virtual ? 'Demo' : 'Real'} conectada.`, "INFO");
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const quote = data.tick.quote.toString();
                const digit = parseInt(quote.charAt(quote.length - 1));
                setLastDigits(prev => [digit, ...prev].slice(0, 100));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract.is_sold) {
                    const profit = parseFloat(contract.profit);
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) updateSignalResult(signalId, profit > 0 ? 'WIN' : 'LOSS', profit, parseFloat(contract.buy_price));
                }
            } else if (data?.error) {
                // Tratamento especial para erro de permissão (Trade Scope)
                if (data.error.code === 'PermissionDenied' || data.error.message.includes('trade scope')) {
                    addLog("ERRO DE TOKEN: Seu token não tem permissão para operar. Crie um novo com a opção 'Trade' marcada.", "ERROR");
                    toast.error("Erro de Permissão", { description: "Gere um novo token na Deriv com a opção 'Trade' (Negociar) marcada." });
                } else if (data.error.code === 'AlreadySubscribed') {
                    // Ignora erro de inscrição duplicada
                } else {
                    addLog(`Erro Deriv: ${data.error.message}`, "ERROR");
                }
                
                if (data.error.code === 'AuthorizationRequired') setIsConnected(false);
            }
        }
    }, [asset, setLastDigits, setAccountBalance, updateSignalResult, addLog]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect, isSocketOpen } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    useEffect(() => { 
        if (asset !== currentAssetRef.current && isSocketOpen) {
            sendMessageRef.current({ forget_all: 'ticks' });
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            currentAssetRef.current = asset;
        }
    }, [asset, isSocketOpen]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
    }, [accountType, realToken, demoToken, connect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, 
        isConnected, 
        status, 
        handleConnect, 
        handleDisconnect: disconnect, 
        manualBuy: (type: ContractType) => {}, 
        toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, isBotRunning, setIsBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};