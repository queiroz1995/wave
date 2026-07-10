"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { DEFAULT_DERIV_APP_ID, useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { toast } from "sonner";
import { saveTradeToHistory } from '@/utils/tradeStorage';

const BotContext = createContext<any>(undefined);

export const useBotContext = () => {
    const context = useContext(BotContext);
    if (!context) throw new Error('useBotContext must be used within a BotProvider');
    return context;
};

const contractToSignal = (contractType: ContractType, isForex?: boolean) => {
    if (isForex) {
        if (contractType === 'DIGITEVEN') return 'CALL';
        if (contractType === 'DIGITODD') return 'PUT';
    }
    if (contractType === 'CALL') return 'CALL';
    if (contractType === 'PUT') return 'PUT';
    if (contractType === 'DIGITOVER') return 'OVER';
    if (contractType === 'DIGITUNDER') return 'UNDER';
    return contractType === 'DIGITEVEN' ? 'EVEN' : 'ODD';
};

const getProposalContractType = (
    requestedType: ContractType,
    digitTradeMode: 'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal',
    overUnderDirection: 'OVER' | 'UNDER',
    asset: string
): ContractType => {
    const isForex = asset.startsWith('frx');
    if (requestedType === 'DIGITEVEN' || requestedType === 'DIGITODD') {
        if (isForex || digitTradeMode === 'riseFall') {
            return requestedType === 'DIGITEVEN' ? 'CALL' : 'PUT';
        }
        if (digitTradeMode === 'overUnder') {
            return overUnderDirection === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
        }
    }
    return requestedType;
};

const getProposalId = (data: any) => {
    return String(
        data.proposal?.id ||
        data.proposal?.proposal_id ||
        data.proposal?.proposalId ||
        data.proposal_id ||
        data.id ||
        ''
    );
};

const getBuyContractId = (data: any) => {
    return String(
        data.buy?.contract_id ||
        data.buy?.contractId ||
        data.buy?.id ||
        data.contract_id ||
        data.contractId ||
        ''
    );
};

const getExitDigit = (contract: any): number | undefined => {
    if (!contract) return undefined;

    const candidates = [
        contract.exit_tick_display_value,
        contract.exit_tick?.tick_display_value,
        contract.exit_spot_display_value,
        contract.current_spot_display_value,
    ].filter(c => c !== undefined && c !== null).map(String);
    if (candidates.length === 0) {
        candidates.push(String(contract.exit_spot ?? contract.current_spot));
    }

    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null && candidate !== 'undefined' && candidate !== '') {
            const strVal = String(candidate).replace(/[^\d]/g, '');
            const lastDigit = parseInt(strVal.slice(-1), 10);
            if (!isNaN(lastDigit)) {
                return lastDigit;
            }
        }
    }

    return undefined;
};

const getContractStatus = (contract: any): 'won' | 'lost' | 'sold' | 'open' | 'closed' | 'expired' | 'settled' | undefined => {
    const status = String(contract?.status || '').toLowerCase();
    if (status === 'won' || status === 'lost' || status === 'sold' || status === 'open' || status === 'closed' || status === 'expired' || status === 'settled') {
        return status as any;
    }
    if (contract?.is_sold) return 'sold';
    if (contract?.is_expired) return 'expired';
    if (contract?.is_closed) return 'closed';
    return undefined;
};

const getContractProfit = (contract: any, savedStake: number): number => {
    if (!contract) return 0;
    const status = getContractStatus(contract);
    const sellPrice = Number(contract.sell_price || 0);
    const buyPrice = Number(contract.buy_price || contract.ask_price || savedStake || 0);
    if (status === 'won' || sellPrice > buyPrice) {
        const payout = sellPrice > 0 ? sellPrice : (buyPrice * 1.95);
        return payout - buyPrice;
    }
    if (status === 'lost') return -buyPrice;
    if (contract.is_sold || status === 'sold' || status === 'closed' || status === 'expired' || status === 'settled') {
        return sellPrice > buyPrice ? sellPrice - buyPrice : -buyPrice;
    }
    return 0;
};

const getContractResult = (contract: any, profit: number): 'WIN' | 'LOSS' => {
    const contractStatus = getContractStatus(contract);
    if (contractStatus === 'won') return 'WIN';
    if (contractStatus === 'lost') return 'LOSS';
    return profit > 0 ? 'WIN' : 'LOSS';
};

export const BotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const stateAndSetters = useBotState();
    useBotPersistence(stateAndSetters);

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        setLastTickEpoch, lastDigits, lastTickEpoch,
        setTradeStatus, tradeStatus, isBotRunning, isPaused,
        accountType, realToken, demoToken,
        appId, setAccountId, duration, takeProfit, stopLoss, totalProfit,
        setCurrentConfidence, setIsStudying, setIsPaused, setIsManipulationDetected,
        digitTradeMode, overUnderDirection, setCurrency, currency,
        digitPrediction,
        isSmartModeActive, virtualTargetLosses,
        virtualLossStreak, setVirtualLossStreak, isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        isWaitingForRecoveryVirtual, setIsWaitingForRecoveryVirtual
    } = stateAndSetters;

    const [appFlow, setAppFlow] = useState<'selection' | 'operating'>('selection');
    const [selectedAIInfo, setSelectedAIInfo] = useState(null);
    const [aiThought, setAiThought] = useState("Aguardando Conexão...");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const [currentLiveTick, setCurrentLiveTick] = useState<number | null>(null);
    const latestTickDigitRef = useRef<number | null>(null);

    const [activeContractTick, setActiveContractTick] = useState(0);
    const [activeContractDigit, setActiveContractDigit] = useState<number | null>(null);

    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const pendingContracts = useRef<Map<string, any>>(new Map());
    const proposalTracker = useRef<Map<number, any>>(new Map());
    const buyTracker = useRef<Map<number, any>>(new Map());
    const lastAutoTradeEpochRef = useRef<number | null>(null);
    const sendMessageRef = useRef<(payload: any) => void>(() => undefined);
    const isTradeInProgressRef = useRef(false);

    const activeVirtualTradeRef = useRef<{
        ticksRemaining: number;
        prediction: ContractType;
        signalId: string;
        strategyName: string;
    } | null>(null);

    const virtualLossStreakRef = useRef(0);
    const virtualTargetLossesRef = useRef(0);
    const isSmartModeActiveRef = useRef(false);

    useEffect(() => { virtualLossStreakRef.current = virtualLossStreak; }, [virtualLossStreak]);
    useEffect(() => { virtualTargetLossesRef.current = virtualTargetLosses; }, [virtualTargetLosses]);
    useEffect(() => { isSmartModeActiveRef.current = isSmartModeActive; }, [isSmartModeActive]);

    const clearPendingTradeState = useCallback(() => {
        proposalTracker.current.clear();
        buyTracker.current.clear();
        isTradeInProgressRef.current = false;
        setTradeStatus('IDLE');
        setActiveContractTick(0);
        setActiveContractDigit(null);
    }, [setTradeStatus]);

    const handleRejectedTrade = useCallback((message: string) => {
        clearPendingTradeState();
        setAiThought("A corretora recusou a ordem. Aguardando novo gatilho...");
        addLog(`[ERRO TRADE] ${message}`, "ERROR");
        toast.error(message);
    }, [addLog, clearPendingTradeState]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'error') {
            clearPendingTradeState();
            setAiThought("Falha ao enviar ordem. Recalculando cenário...");
            return;
        }
        if (event.type !== 'message') return;

        if (data?.msg_type === 'tick') {
            const tickSymbol = data.tick?.symbol;
            const tickQuote = data.tick?.quote ?? data.tick?.tick;
            const pipSize = data.tick?.pip_size;
            let lastDigit = 0;
            if (tickQuote !== undefined && pipSize !== undefined) {
                const fixedValue = Number(tickQuote).toFixed(pipSize);
                lastDigit = Number(fixedValue.slice(-1));
            } else {
                const tickValueStr = String(data.tick?.quote ?? data.tick?.display_value ?? data.tick?.tick);
                lastDigit = Number(tickValueStr.replace(/[^\d]/g, '').slice(-1));
            }
            const epoch = data.tick?.epoch;
            if (Number.isFinite(lastDigit) && tickSymbol === asset) {
                setCurrentLiveTick(lastDigit);
                latestTickDigitRef.current = lastDigit;
                setLastTickEpoch(epoch);
                setLastDigits(prev => [lastDigit, ...prev].slice(0, 500));

                if (activeVirtualTradeRef.current) {
                    activeVirtualTradeRef.current.ticksRemaining--;
                    if (activeVirtualTradeRef.current.ticksRemaining <= 0) {
                        const virtualTrade = activeVirtualTradeRef.current;
                        const exitDigit = lastDigit;
                        const isEven = exitDigit % 2 === 0;
                        let isWin = false;
                        if (virtualTrade.prediction === 'DIGITEVEN') isWin = isEven;
                        else if (virtualTrade.prediction === 'DIGITODD') isWin = !isEven;
                        else if (virtualTrade.prediction === 'DIGITOVER') isWin = exitDigit > digitPrediction;
                        else if (virtualTrade.prediction === 'DIGITUNDER') isWin = exitDigit < digitPrediction;
                        const result = isWin ? 'WIN' : 'LOSS';
                        addLog(`[VIRTUAL] ${result === 'WIN' ? 'Vitória Virtual' : 'Perda Virtual'} (Dígito: ${exitDigit})`, result, { isVirtual: true, strategyName: virtualTrade.strategyName, contractType: virtualTrade.prediction, exitDigit });
                        if (isWin) {
                            setVirtualLossStreak(0);
                        } else {
                            setVirtualLossStreak(virtualLossStreakRef.current + 1);
                        }
                        setIsWaitingForVirtualResult(false);
                        activeVirtualTradeRef.current = null;
                        updateSignalResult(virtualTrade.signalId, result, isWin ? 0.35 : -0.35, 0.35, exitDigit);
                    }
                }
            }
        }

        if (data?.msg_type === 'proposal') {
            const tracked = proposalTracker.current.get(data.req_id);
            if (!tracked) return;
            if (data.error) {
                handleRejectedTrade(data.error.message || "A Deriv recusou a proposta.");
                return;
            }
            const proposalId = getProposalId(data);
            if (!proposalId) {
                handleRejectedTrade("A Deriv não retornou o identificador da proposta.");
                return;
            }
            buyTracker.current.set(data.req_id, tracked);
            proposalTracker.current.delete(data.req_id);
            sendMessageRef.current({ buy: proposalId, price: tracked.stake, req_id: data.req_id });
            setAiThought(`Entrada confirmada. Executando...`);
        }

        if (data?.msg_type === 'buy') {
            const saved = buyTracker.current.get(data.req_id);
            if (data.error) {
                handleRejectedTrade(data.error.message || "A Deriv recusou a compra.");
                return;
            }
            const contractId = getBuyContractId(data);
            if (!saved || !contractId) {
                handleRejectedTrade("A compra foi enviada, mas a Deriv não retornou o contrato.");
                return;
            }
            pendingContracts.current.set(contractId, saved);
            buyTracker.current.delete(data.req_id);
            sendMessageRef.current({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
            addLog(`[OK] Ordem ativa: ${contractId}`, "TRADE");
            setTradeStatus('ACTIVE');
            setAiThought("Contrato ativo. Monitorando resultado...");
        }

        if (data?.msg_type === 'proposal_open_contract') {
            if (data.error) {
                addLog(`[ERRO TRADE] Erro no contrato: ${data.error.message}`, "ERROR");
                clearPendingTradeState();
                return;
            }
            const contract = data.proposal_open_contract;
            const contractId = String(contract.contract_id || '');
            const saved = pendingContracts.current.get(contractId);
            if (!saved) return;

            setActiveContractTick(contract.tick_count || 0);
            const currentSpotStr = String(contract.current_spot_display_value ?? contract.current_spot);
            if (currentSpotStr !== 'undefined' && currentSpotStr !== '') {
                const cleanStr = currentSpotStr.replace(/[^\d]/g, '');
                const lastDigit = parseInt(cleanStr.slice(-1), 10);
                if (!isNaN(lastDigit)) setActiveContractDigit(lastDigit);
            }

            const contractStatus = getContractStatus(contract);
            if (contractStatus && contractStatus !== 'open') {
                const exitDigit = getExitDigit(contract);
                const profit = getContractProfit(contract, saved.stake);
                const result = getContractResult(contract, profit);
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);
                if (result === 'WIN') {
                    setWins(w => w + 1);
                    martingaleLevel.current = 0;
                    setVirtualLossStreak(0);
                } else {
                    setLosses(l => l + 1);
                    martingaleLevel.current++;
                }
                updateSignalResult(saved.signalId, result, profit, saved.stake, exitDigit);
                saveTradeToHistory({ id: saved.signalId, asset, strategy: saved.strategyName, signal: contractToSignal(saved.contractType, asset.startsWith('frx')), stake: saved.stake, profit, result, exitDigit });
                addLog(`[RESULTADO] ${result} ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (Dígito: ${exitDigit})`, result);
                pendingContracts.current.delete(contractId);
                clearPendingTradeState();
                setAiThought("Operação finalizada. Aguardando nova oportunidade...");
            }
        }

        if (data?.msg_type === 'balance' && data.balance?.balance !== undefined) {
            setAccountBalance(parseFloat(data.balance.balance));
            if (data.balance.currency) setCurrency(data.balance.currency);
        }
    }, [asset, addLog, clearPendingTradeState, handleRejectedTrade, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, setTradeStatus, setVirtualLossStreak, setLastDigits, setLastTickEpoch, digitPrediction, setIsWaitingForVirtualResult, setCurrency]);

    const ws = useTradingWebSocketManager({
        isConnected, status, setIsConnected, setIsConnecting, setStatus, setAccountBalance, setAccountId, setCurrency,
        onMessage: handleWebSocketMessage, reconnectAttemptsRef: { current: 0 } as any, addLog
    });

    useEffect(() => { sendMessageRef.current = ws.sendMessage; }, [ws.sendMessage]);

    const prevEpochRef = useRef<number | null>(null);
    useEffect(() => {
        if (!isConnected) return;
        if (tradeStatus === 'ACTIVE') {
            if (lastTickEpoch !== prevEpochRef.current) {
                prevEpochRef.current = lastTickEpoch;
                setActiveContractTick(prev => Math.min(duration, prev + 1));
            }
        } else {
            setActiveContractTick(0);
            prevEpochRef.current = null;
        }
    }, [lastTickEpoch, tradeStatus, duration, isConnected]);

    useEffect(() => {
        if (!isConnected) return;
        setLastDigits([]);
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;
        sendMessageRef.current({ forget_all: 'ticks' });
        sendMessageRef.current({ ticks: asset, subscribe: 1 });
        return () => { sendMessageRef.current({ forget_all: 'ticks' }); };
    }, [asset, isConnected]);

    const handleConnect = useCallback(async () => {
        const token = (accountType === 'real' ? realToken : demoToken).trim();
        if (!token) { toast.error("Insira seu Token."); return; }
        ws.connectWithToken(token, appId.trim() || DEFAULT_DERIV_APP_ID, accountType);
    }, [accountType, realToken, demoToken, appId, ws]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake?: number) => {
        if (!ws.isConnected || isTradeInProgressRef.current) return { success: false, isVirtual: false };
        const targetProfit = parseFloat(takeProfit) || 0;
        const maxLoss = parseFloat(stopLoss) || 0;
        if ((targetProfit > 0 && totalProfit >= targetProfit) || (maxLoss > 0 && Math.abs(Math.min(totalProfit, 0)) >= maxLoss)) return { success: false, isVirtual: false };

        const isMartingaleCycle = martingaleLevel.current > 0;
        const targetLosses = isMartingaleCycle ? 0 : (isSmartModeActiveRef.current ? 1 : virtualTargetLossesRef.current);
        
        if (targetLosses > 0 && virtualLossStreakRef.current < targetLosses) {
            if (activeVirtualTradeRef.current) return { success: false, isVirtual: false };
            setIsWaitingForVirtualResult(true);
            activeVirtualTradeRef.current = { ticksRemaining: duration, prediction: contractType, signalId, strategyName };
            setAiThought(`Simulando entrada virtual...`);
            return { success: true, isVirtual: true };
        }

        const baseStake = overrideStake || Number(initialStake) || 0.35;
        const mgFactor = parseFloat(stateAndSetters.martingaleFactor) || 2.1;
        const stake = parseFloat((stateAndSetters.isMartingaleActive && martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake).toFixed(2));
        
        isTradeInProgressRef.current = true;
        const reqId = Date.now();
        const proposalContractType = getProposalContractType(contractType, digitTradeMode, overUnderDirection, asset);
        const proposal: any = { proposal: 1, amount: stake, basis: "stake", contract_type: proposalContractType, currency, duration, duration_unit: "t", underlying_symbol: symbol, req_id: reqId };
        if (proposalContractType === 'DIGITOVER' || proposalContractType === 'DIGITUNDER') proposal.barrier = String(digitPrediction);

        proposalTracker.current.set(reqId, { strategyName, signalId, stake, contractType });
        setTradeStatus('SENDING');
        ws.sendMessage(proposal);
        return { success: true, isVirtual: false };
    }, [ws, initialStake, stateAndSetters.martingaleFactor, stateAndSetters.isMartingaleActive, digitPrediction, setTradeStatus, duration, digitTradeMode, overUnderDirection, asset, currency, takeProfit, stopLoss, totalProfit, setIsWaitingForVirtualResult]);

    const manualBuy = useCallback((contractType: ContractType, source: string = 'Manual', overrideStake?: number) => {
        const signalId = `manual-${Date.now()}`;
        const result = executeBuy(contractType, source, signalId, asset, overrideStake);
        if (result && result.success) {
            addSignal({ id: signalId, strategy: result.isVirtual ? `VIRTUAL: ${source}` : source, signal: contractToSignal(contractType, asset.startsWith('frx')), details: 'Manual', winRate: '100%' });
        }
    }, [executeBuy, asset, addSignal]);

    const handleDisconnect = useCallback(() => { ws.disconnect(); }, [ws]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters,
        isConnected, isConnecting, status, handleConnect, handleDisconnect,
        toggleBot: () => setIsBotRunning(!isBotRunning),
        resetOperations: () => {
            totalProfitRef.current = 0; setTotalProfit(0); setWins(0); setLosses(0);
            stateAndSetters.setSignals([]); martingaleLevel.current = 0;
            clearPendingTradeState(); setVirtualLossStreak(0); setIsWaitingForVirtualResult(false);
        },
        appFlow, setAppFlow, selectedAIInfo,
        selectAI: (ia: any) => { setSelectedAIInfo(ia); setAppFlow('operating'); },
        exitToSelection: () => { setIsBotRunning(false); setAppFlow('selection'); },
        aiThought, manualBuy, isSettingsOpen, setIsSettingsOpen, isConfigModalOpen, setIsConfigModalOpen,
        currentLiveTick, activeContractTick, activeContractDigit
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect, isBotRunning, setIsBotRunning, appFlow, selectedAIInfo, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, currentLiveTick, activeContractTick, activeContractDigit, setIsWaitingForVirtualResult, setTotalProfit, setWins, setLosses, clearPendingTradeState, setVirtualLossStreak]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};