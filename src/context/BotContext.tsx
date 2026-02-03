"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { supabase } from '@/integrations/supabase/client';
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

    const isTradeOpen = useRef(false);
    const totalProfitRef = useRef(0.00);
    const [lastCompletedContract, setLastCompletedContract] = useState<any>(null);
    
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    const lastTickTimestamp = useRef<number>(Date.now());
    const currentAssetRef = useRef<string>('');

    const {
        addLog, setAccountBalance, setChartData, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setActiveContract,
        setLastTickEpoch,
        setTradeStatus,
        isBotRunning,
        setMarketPulse,
        accountType, realToken, demoToken,
        isRouletteMode, setRouletteTimer,
        setIsRouletteSpinning,
        setRouletteHistory,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        setLastSelectedRouletteNumbers,
        duration,
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Conectando...', color: 'bg-yellow-500' });

    // FUNÇÃO PARA EXECUTAR COMPRA NA DERIV (ENTRADA REAL)
    const executeTrade = useCallback((contractType: ContractType, prediction?: number, stake?: number, strategyName: string = 'Manual') => {
        if (!isConnected) {
            toast.error("Você precisa conectar o Token para realizar apostas reais!");
            return;
        }

        const amount = stake || parseFloat(initialStake) || 0.35;
        
        const proposal = {
            buy: 1,
            price: amount,
            parameters: {
                amount: amount,
                basis: 'stake',
                contract_type: contractType,
                currency: 'USD',
                duration: duration,
                duration_unit: 't',
                symbol: asset,
                barrier: prediction !== undefined ? String(prediction) : undefined
            }
        };

        addLog(`Enviando Ordem Real: ${contractType} (${prediction ?? ''}) | $${amount.toFixed(2)}`, 'TRADE', { 
            stake: amount, 
            strategyName,
            contractType,
            barrier: prediction
        });
        
        sendMessageRef.current(proposal);
    }, [isConnected, initialStake, asset, duration, addLog]);

    const manualBuy = useCallback((type: ContractType, strategy: string, customStake?: number) => {
        executeTrade(type, undefined, customStake, strategy);
    }, [executeTrade]);

    // LÓGICA DO TEMPORIZADOR DA ROLETA (16s)
    useEffect(() => {
        if (!isRouletteMode) return;
        
        const timer = setInterval(() => {
            setRouletteTimer((prev: number) => {
                if (prev <= 1) {
                    handleRouletteResult();
                    return 16;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRouletteMode, selectedRouletteNumbers]);

    const handleRouletteResult = useCallback(async () => {
        setIsRouletteSpinning(true);
        const resultDigit = lastDigits[0];
        
        // SALVA RESULTADO NO SUPABASE PARA ESTATÍSTICAS GLOBAIS
        await supabase.from('roulette_results').insert({
            number: resultDigit,
            source: 'Rico 2.0 App'
        });
        
        if (selectedRouletteNumbers.length > 0) {
            setLastSelectedRouletteNumbers(selectedRouletteNumbers);
        }

        if (isConnected && selectedRouletteNumbers.length > 0) {
            selectedRouletteNumbers.forEach((num: number) => {
                executeTrade('DIGITMATCH' as any, num, undefined, 'Roleta');
            });
        }

        setTimeout(() => {
            setIsRouletteSpinning(false);
            setRouletteHistory((prev: number[]) => [resultDigit, ...prev].slice(0, 16));
            
            if (selectedRouletteNumbers.length > 0) {
                const isWinner = selectedRouletteNumbers.includes(resultDigit);
                const stake = parseFloat(initialStake);
                
                if (isWinner) {
                    const winAmount = stake * 9; 
                    totalProfitRef.current += winAmount;
                    setTotalProfit(totalProfitRef.current);
                    setWins(prev => prev + 1);
                    toast.success(`ROLETA: VITÓRIA! Dígito ${resultDigit}`, { description: `Lucro: +$${winAmount.toFixed(2)}` });
                    addLog(`VITÓRIA ROLETA: Dígito ${resultDigit}`, 'WIN', { profit: winAmount, exitDigit: resultDigit });
                } else {
                    const totalLoss = stake * selectedRouletteNumbers.length;
                    totalProfitRef.current -= totalLoss;
                    setTotalProfit(totalProfitRef.current);
                    setLosses(prev => prev + 1);
                    toast.error(`ROLETA: DERROTA. Dígito ${resultDigit}`, { description: `Prejuízo: -$${totalLoss.toFixed(2)}` });
                    addLog(`DERROTA ROLETA: Dígito ${resultDigit}`, 'LOSS', { profit: -totalLoss, exitDigit: resultDigit });
                }
            }
            setSelectedRouletteNumbers([]); 
        }, 3000);
    }, [lastDigits, selectedRouletteNumbers, initialStake, isConnected, executeTrade, addLog, setTotalProfit, setWins, setLosses, setSelectedRouletteNumbers, setLastSelectedRouletteNumbers]);

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

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const now = Date.now();
        const diff = (now - lastTickTimestamp.current) / 1000;
        lastTickTimestamp.current = now;
        if (diff > 1.8) setMarketPulse('calm');
        else if (diff > 0.8) setMarketPulse('stable');
        else setMarketPulse('aggressive');

        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;

        setLastDigits(prev => [lastDigit, ...prev].slice(0, 250));
        setLastTickEpoch(tick.epoch);
        setChartData(prev => [...prev, { time: new Date(tick.epoch * 1000).toLocaleTimeString('pt-BR', { hour12: false }), price: parseFloat(tick.quote) }].slice(-50));

        // SALVAMENTO AUTOMÁTICO NO SUPABASE
        supabase.from('ticks').upsert({
            symbol: tick.symbol,
            epoch: tick.epoch,
            digit: lastDigit,
            type: 'live'
        }, { onConflict: 'symbol,epoch' }).then(({ error }) => {
            if (error) console.warn("[Supabase] Erro ao salvar tick:", error.message);
        });

    }, [asset, setLastDigits, setLastTickEpoch, setChartData, setMarketPulse]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        
        if (event.type === 'socket_ready') {
            // Assim que o socket abre (mesmo sem token), assina o ativo atual
            console.log("[BotContext] Socket pronto. Assinando ticks públicos para:", asset);
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            return;
        }

        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                if (data.error) {
                    toast.error(`Falha na Autorização: ${data.error.message}`);
                    setStatus({ message: 'Token Inválido', color: 'bg-red-500' });
                    setIsConnected(false);
                } else {
                    setIsConnected(true); 
                    setStatus({ message: `Conta ${data.authorize.is_virtual ? 'Demo' : 'Real'} Ativa`, color: 'bg-green-500' });
                    if (data.authorize.balance) setAccountBalance(data.authorize.balance);
                    sendMessageRef.current({ balance: 1, subscribe: 1 });
                }
            } 
            else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) {
                    setAccountBalance(data.balance.balance);
                }
            }
            else if (data?.msg_type === 'tick') {
                if (data.tick?.symbol === asset) processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    setTradeStatus('ACTIVE'); 
                    setActiveContract({ contract_id: data.buy.contract_id }); 
                } else if (data.error) {
                    addLog(`Erro na Compra: ${data.error.message}`, 'ERROR');
                    toast.error(data.error.message);
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) {
                    setLastCompletedContract(poc);
                }
            }
        }
    }, [asset, processTickData, setAccountBalance, setActiveContract, setTradeStatus, addLog]);

    const ws = useTradingWebSocketManager({ 
        isConnected, 
        status, 
        setIsConnected, 
        setStatus, 
        setAccountBalance, 
        onMessage: handleWebSocketMessage, 
        reconnectAttemptsRef 
    });
    
    const { sendMessage, connect, disconnect, isSocketOpen } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // Sempre que o ativo mudar, tenta assinar (se o socket estiver aberto)
    useEffect(() => { 
        if (asset !== currentAssetRef.current) {
            if (isSocketOpen) {
                sendMessageRef.current({ forget_all: 'ticks' });
                sendMessageRef.current({ ticks: asset, subscribe: 1 });
            }
            fetchInitialTicks();
            currentAssetRef.current = asset;
        }
    }, [asset, isSocketOpen, fetchInitialTicks]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) connect(token, type);
        else toast.error("Por favor, insira um token.");
    }, [accountType, realToken, demoToken, connect]);

    const handleDisconnect = useCallback(() => { disconnect(); }, [disconnect]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, status, handleConnect, handleDisconnect, manualBuy, toggleBot: () => setIsBotRunning(!isBotRunning),
    }), [stateAndSetters, isConnected, status, handleConnect, handleDisconnect, manualBuy, isBotRunning]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};