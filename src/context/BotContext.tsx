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
    const hasTradedCurrentRoundRef = useRef<boolean>(false);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake,
        isBotRunning,
        accountType, realToken, demoToken,
        isRouletteMode, setRouletteTimer,
        setIsRouletteSpinning,
        setRouletteHistory,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        selectedRouletteEven, setSelectedRouletteEven,
        selectedRouletteOdd, setSelectedRouletteOdd,
        setLastRouletteResult,
        addSignal, updateSignalResult,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });

    // 1. EXECUÇÃO DE APOSTAS
    const executeTrade = useCallback((prediction: number | string, stake: number, type: 'DIGITMATCH' | 'DIGITEVEN' | 'DIGITODD' = 'DIGITMATCH') => {
        if (!isConnected) return;

        const label = type === 'DIGITEVEN' ? 'PAR' : type === 'DIGITODD' ? 'ÍMPAR' : `Número ${prediction}`;
        const signalId = addSignal({
            strategy: "Roleta",
            signal: type === 'DIGITEVEN' ? 'EVEN' : type === 'DIGITODD' ? 'ODD' : 'ODD', 
            details: `Aposta ${label}`,
            stake: stake
        });

        const params: any = {
            amount: stake,
            basis: 'stake',
            contract_type: type,
            currency: 'USD',
            duration: 1,
            duration_unit: 't',
            symbol: asset,
        };

        if (type === 'DIGITMATCH') {
            params.barrier = String(prediction);
        }

        sendMessageRef.current({
            buy: 1,
            price: stake,
            subscribe: 1,
            parameters: params,
            passthrough: { signalId }
        });
    }, [isConnected, asset, addSignal]);

    // 2. CRONÔMETRO CENTRALIZADO (Sincronizado a cada 16s)
    useEffect(() => {
        if (!isRouletteMode) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const cycleMs = 16000;
            const elapsed = now % cycleMs;
            const remaining = Math.ceil((cycleMs - elapsed) / 1000);

            setRouletteTimer(remaining === 0 ? 16 : remaining);

            // Giro da roleta (4s finais)
            if (remaining <= 4 && remaining >= 1) {
                setIsRouletteSpinning(true);
            } else {
                setIsRouletteSpinning(false);
            }

            // Envio das apostas (Exatamente aos 5s)
            if (remaining === 5 && !hasTradedCurrentRoundRef.current) {
                if (isConnected) {
                    const stakeAmount = parseFloat(initialStake);
                    let hasBets = false;

                    if (selectedRouletteNumbers.length > 0) {
                        selectedRouletteNumbers.forEach(num => executeTrade(num, stakeAmount, 'DIGITMATCH'));
                        hasBets = true;
                    }
                    if (selectedRouletteEven) {
                        executeTrade('even', stakeAmount, 'DIGITEVEN');
                        hasBets = true;
                    }
                    if (selectedRouletteOdd) {
                        executeTrade('odd', stakeAmount, 'DIGITODD');
                        hasBets = true;
                    }

                    if (hasBets) {
                        hasTradedCurrentRoundRef.current = true;
                        addLog(`Apostas enviadas. Aguardando sorteio...`, "TRADE");
                    }
                }
            }

            // Limpeza para nova rodada (Ao reiniciar o ciclo)
            if (remaining === 11) {
                setLastRouletteResult(null);
                setSelectedRouletteNumbers([]);
                setSelectedRouletteEven(false);
                setSelectedRouletteOdd(false);
                hasTradedCurrentRoundRef.current = false;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRouletteMode, isConnected, selectedRouletteNumbers, selectedRouletteEven, selectedRouletteOdd, initialStake, executeTrade, setRouletteTimer, setIsRouletteSpinning, setLastRouletteResult, addLog, setSelectedRouletteNumbers, setSelectedRouletteEven, setSelectedRouletteOdd]);

    // 3. WEBSOCKET FEED (Processamento de Resultados Reais)
    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'socket_ready') {
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
        } else if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true);
                setStatus({ message: `Ativo: ${data.authorize.is_virtual ? 'Demo' : 'Real'}`, color: 'bg-green-500' });
                if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                sendMessageRef.current({ balance: 1, subscribe: 1 });
                addLog(`Conexão estabelecida com sucesso.`, "INFO");
            } else if (data?.msg_type === 'tick' && data.tick?.symbol === asset) {
                const quote = data.tick.quote.toString();
                const digit = parseInt(quote.charAt(quote.length - 1));
                setLastDigits(prev => [digit, ...prev].slice(0, 100));
            } else if (data?.msg_type === 'balance') {
                setAccountBalance(data.balance.balance);
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                
                // Quando o contrato é vendido (finalizado)
                if (contract.is_sold) {
                    const profit = parseFloat(contract.profit);
                    const exitDigit = parseInt(contract.exit_tick_display_value.slice(-1));
                    const signalId = data.echo_req.passthrough?.signalId;
                    
                    // Sincroniza o visual da roleta com o dígito real da Deriv
                    setLastRouletteResult(exitDigit);
                    setRouletteHistory(prev => [exitDigit, ...prev].slice(0, 50));

                    // Atualiza lucro acumulado (Leitura Real da API)
                    totalProfitRef.current += profit;
                    setTotalProfit(totalProfitRef.current);
                    
                    if (profit > 0) {
                        setWins(prev => prev + 1);
                        const mult = contract.contract_type === 'DIGITMATCH' ? '9.00x' : '1.96x';
                        addLog(`GANHOU! Número ${exitDigit} (${mult}). Retorno: +$${profit.toFixed(2)}`, "WIN", { profit, strategyName: "Roleta" });
                    } else {
                        setLosses(prev => prev + 1);
                        addLog(`PERDEU: Número ${exitDigit}. Custo: -$${Math.abs(profit).toFixed(2)}`, "LOSS", { profit, strategyName: "Roleta" });
                    }

                    if (signalId) {
                        updateSignalResult(signalId, profit > 0 ? 'WIN' : 'LOSS', profit, parseFloat(contract.buy_price), exitDigit);
                    }
                }
            } else if (data?.error) {
                addLog(`Atenção: ${data.error.message}`, "ERROR");
            }
        }
    }, [asset, setLastDigits, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, addLog, setLastRouletteResult, setRouletteHistory]);

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
        manualBuy: () => {}, 
        toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, disconnect, isBotRunning, setIsBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};