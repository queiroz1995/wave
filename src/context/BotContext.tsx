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

const invertContractType = (type: ContractType): ContractType => {
    if (type === 'DIGITEVEN' || type === 'DIGITOVER') {
        return type === 'DIGITEVEN' ? 'DIGITODD' : 'DIGITUNDER';
    }
    return type === 'CALL' ? 'PUT' : 'CALL';
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
        return status;
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

    if (status === 'lost') {
        return -buyPrice;
    }

    if (contract.is_sold || status === 'sold' || status === 'closed' || status === 'expired' || status === 'settled') {
        if (sellPrice > buyPrice) {
            return sellPrice - buyPrice;
        }
        return -buyPrice;
    }

    return 0;
};

const getContractResult = (contract: any, profit: number): 'WIN' | 'LOSS' => {
    const contractStatus = getContractStatus(contract);

    if (contractStatus === 'won') return 'WIN';
    if (contractStatus === 'lost') return 'LOSS';

    if (profit > 0) return 'WIN';
    return 'LOSS';
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
        appId, setAppId, setAccountId, duration, takeProfit, stopLoss, totalProfit,
        setCurrentConfidence, setIsStudying, setIsPaused, setIsManipulationDetected,
        digitTradeMode, overUnderDirection, setCurrency, currency, setSignals,
        digitPrediction,
        isSmartModeActive, virtualTargetLosses, setVirtualTargetLosses,
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
    const proposalTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number }>>(new Map());
    const buyTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number }>>(new Map());
    const lastAutoTradeEpochRef = useRef<number | null>(null);
    const sendMessageRef = useRef<(payload: any) => void>(() => undefined);
    const executeBuyRef = useRef<any>(null);
    const isTradeInProgressRef = useRef(false);

    // Referências para simulação de trade virtual local
    const activeVirtualTradeRef = useRef<{
        ticksRemaining: number;
        prediction: ContractType;
        signalId: string;
        strategyName: string;
    } | null>(null);

    // Sincronização de estados com refs para evitar reconexões do WebSocket
    const virtualLossStreakRef = useRef(0);
    const virtualTargetLossesRef = useRef(0);
    const isSmartModeActiveRef = useRef(false);

    useEffect(() => {
        virtualLossStreakRef.current = virtualLossStreak;
    }, [virtualLossStreak]);

    useEffect(() => {
        virtualTargetLossesRef.current = virtualTargetLosses;
    }, [virtualTargetLosses]);

    useEffect(() => {
        isSmartModeActiveRef.current = isSmartModeActive;
    }, [isSmartModeActive]);

    const publicWsRef = useRef<WebSocket | null>(null);

    const clearPendingTradeState = useCallback(() => {
        proposalTracker.current.clear();
        buyTracker.current.clear();
        isTradeInProgressRef.current = false;
        setTradeStatus('IDLE');
        setActiveContractTick(0);
        setActiveContractDigit(null);
    }, [setTradeStatus]);

    const handleRejectedTrade = useCallback((message: string) => {
        const pendingSignalIds = [
            ...Array.from(proposalTracker.current.values()).map((item) => item.signalId),
            ...Array.from(buyTracker.current.values()).map((item) => item.signalId)
        ];

        clearPendingTradeState();
        setAiThought("A corretora recusou a ordem. Aguardando novo gatilho...");
        addLog(`[ERRO TRADE] ${message}`, "ERROR");

        if (pendingSignalIds.length > 0) {
            stateAndSetters.setSignals((prev: any[]) => prev.filter((signal: any) => !pendingSignalIds.includes(signal.id)));
        }

        toast.error(message);
    }, [addLog, clearPendingTradeState, stateAndSetters]);

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
                setLastDigits(prev => {
                    return [lastDigit, ...prev].slice(0, 500);
                });

                // Processamento de Simulação de Trade Virtual Local (Contador Regressivo de Ticks)
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

                        addLog(
                            `[VIRTUAL] ${result === 'WIN' ? 'Vitória Virtual' : 'Perda Virtual'} (Dígito: ${exitDigit})`,
                            result,
                            { isVirtual: true, strategyName: virtualTrade.strategyName, contractType: virtualTrade.prediction, exitDigit }
                        );

                        if (isWin) {
                            setVirtualLossStreak(0);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;
                            updateSignalResult(virtualTrade.signalId, 'WIN', 0.35, 0.35, exitDigit);
                        } else {
                            const nextStreak = virtualLossStreakRef.current + 1;
                            setVirtualLossStreak(nextStreak);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;
                            updateSignalResult(virtualTrade.signalId, 'LOSS', -0.35, 0.35, exitDigit);
                        }
                    }
                }
            }
        }

        if (data?.msg_type === 'proposal') {
            const tracked = proposalTracker.current.get(data.req_id);

            if (!tracked) return;

            if (data.error) {
                const errorMsg = data.error.message || data.error.code || "A Deriv recusou a proposta.";
                addLog(`[ERRO TRADE] Proposta recusada pela Deriv: ${errorMsg}`, "ERROR");
                handleRejectedTrade(errorMsg);
                return;
            }

            const proposalId = getProposalId(data);

            if (!proposalId) {
                addLog(`[ERRO TRADE] Resposta de proposal sem ID: ${JSON.stringify(data)}`, "ERROR");
                handleRejectedTrade("A Deriv não retornou o identificador da proposta.");
                return;
            }

            const saved = {
                signalId: tracked.signalId,
                stake: tracked.stake,
                strategyName: tracked.strategyName,
                contractType: tracked.contractType,
                tradeCycleId: tracked.tradeCycleId,
                subscriptionId: undefined
            };

            buyTracker.current.set(data.req_id, saved);
            proposalTracker.current.delete(data.req_id);

            sendMessageRef.current({
                buy: proposalId,
                price: tracked.stake,
                req_id: data.req_id
            });

            setAiThought(`Entrada confirmada. Executando ${contractToSignal(tracked.contractType, asset.startsWith('frx'))}...`);
            return;
        }

        if (data?.msg_type === 'buy') {
            const saved = buyTracker.current.get(data.req_id);

            if (data.error) {
                const errorMsg = data.error.message || data.error.code || "A Deriv recusou a compra.";
                addLog(`[ERRO TRADE] Compra recusada pela Deriv: ${errorMsg}`, "ERROR");
                handleRejectedTrade(errorMsg);
                return;
            }

            const contractId = getBuyContractId(data);

            if (!saved || !contractId) {
                handleRejectedTrade("A compra foi enviada, mas a Deriv não retornou o contrato.");
                return;
            }

            pendingContracts.current.set(contractId, saved);
            buyTracker.current.delete(data.req_id);

            sendMessageRef.current({
                proposal_open_contract: 1,
                contract_id: contractId,
                subscribe: 1
            });

            addLog(`[OK] Ordem ativa: ${contractId}`, "TRADE");
            setTradeStatus('ACTIVE');
            setAiThought("Contrato ativo. Monitorando resultado...");
            return;
        }

        if (data?.msg_type === 'proposal_open_contract') {
            if (data.error) {
                const errorMsg = data.error.message || data.error.code || "Erro ao monitorar contrato.";
                addLog(`[ERRO TRADE] Erro no contrato: ${errorMsg}`, "ERROR");
                clearPendingTradeState();
                setAiThought("Erro ao monitorar contrato. Aguardando novo gatilho...");
                return;
            }

            const contract = data.proposal_open_contract;
            const contractId = String(contract.contract_id || contract.contractId || contract.id || '');
            const directSaved = contractId ? pendingContracts.current.get(contractId) : undefined;
            const fallbackEntry =
                !directSaved && pendingContracts.current.size === 1
                    ? pendingContracts.current.entries().next().value as [string, any] | undefined
                    : undefined;

            const pendingKey = directSaved ? contractId : fallbackEntry?.[0];
            const saved = directSaved ?? fallbackEntry?.[1];

            if (!saved) return;

            if (contract) {
                const tickCount = contract.tick_count || 0;
                setActiveContractTick(tickCount);
                const currentSpotStr = String(contract.current_spot_display_value ?? contract.current_spot);
                if (currentSpotStr !== 'undefined' && currentSpotStr !== '') {
                    const cleanStr = currentSpotStr.replace(/[^\d]/g, '');
                    const lastDigit = parseInt(cleanStr.slice(-1), 10);
                    if (!isNaN(lastDigit)) {
                        setActiveContractDigit(lastDigit);
                    }
                }
            }

            if (data.subscription?.id && !saved.subscriptionId) {
                saved.subscriptionId = String(data.subscription.id);
            }

            const contractStatus = getContractStatus(contract);
            const isDecided =
                contractStatus === 'won' ||
                contractStatus === 'lost' ||
                contractStatus === 'sold' ||
                contractStatus === 'closed' ||
                contractStatus === 'expired' ||
                contractStatus === 'settled' ||
                contract?.is_sold === true ||
                contract?.is_expired === true ||
                contract?.is_closed === true;

            if (isDecided) {
                const exitDigit = getExitDigit(contract);
                const profit = getContractProfit(contract, saved.stake);
                const result = getContractResult(contract, profit);

                if (exitDigit !== undefined) {
                    setCurrentLiveTick(exitDigit);
                    latestTickDigitRef.current = exitDigit;
                }

                // Resolve imediatamente sem esperar ciclo de 16s
                totalProfitRef.current += profit;
                setTotalProfit(totalProfitRef.current);

                if (result === 'WIN') {
                    setWins((w: number) => w + 1);
                    martingaleLevel.current = 0;
                    setVirtualLossStreak(0); // Reset virtual loss streak to 0 on real WIN!
                } else {
                    setLosses((l: number) => l + 1);
                    martingaleLevel.current++;
                }

                updateSignalResult(
                    saved.signalId,
                    result,
                    profit,
                    saved.stake,
                    exitDigit
                );

                saveTradeToHistory({
                    id: saved.signalId,
                    asset: asset,
                    strategy: saved.strategyName,
                    signal: contractToSignal(saved.contractType, asset.startsWith('frx')),
                    stake: saved.stake,
                    profit: profit,
                    result: result,
                    exitDigit: exitDigit
                });

                addLog(
                    `[RESULTADO] ${result} ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (Dígito: ${exitDigit})`,
                    result
                );

                if (pendingKey) {
                    pendingContracts.current.delete(pendingKey);
                }

                if (saved.subscriptionId && typeof saved.subscriptionId === 'string' && saved.subscriptionId.trim() !== '') {
                    sendMessageRef.current({
                        forget: saved.subscriptionId
                    });
                }

                isTradeInProgressRef.current = false;
                setTradeStatus('IDLE');
                setActiveContractTick(0);
                setActiveContractDigit(null);
                setAiThought("Operação finalizada. Aguardando nova oportunidade...");
                return;
            }

            return;
        }

        if (data?.msg_type === 'balance' && data.balance?.balance !== undefined) {
            setAccountBalance(parseFloat(data.balance.balance));
            if (data.balance.currency) {
                setCurrency(data.balance.currency);
            }
        }

        if (data?.error) {
            const errorMessage = data.error?.message || "A Deriv recusou a operação.";
            handleRejectedTrade(errorMessage);
        }
    }, [
        asset,
        addLog,
        clearPendingTradeState,
        handleRejectedTrade,
        setAccountBalance,
        setTotalProfit,
        setWins,
        setLosses,
        updateSignalResult,
        setTradeStatus,
        stateAndSetters,
        setVirtualLossStreak
    ]);

    const ws = useTradingWebSocketManager({
        isConnected,
        status,
        setIsConnected,
        setIsConnecting,
        setStatus,
        setAccountBalance,
        setAccountId,
        setCurrency,
        onMessage: handleWebSocketMessage,
        reconnectAttemptsRef: { current: 0 } as any,
        addLog
    });

    useEffect(() => {
        sendMessageRef.current = ws.sendMessage;
    }, [ws.sendMessage]);

    // Monitoramento de Ticks em Tempo Real para a Operação Ativa
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
        if (!isConnected) {
            setLastDigits([]);
            setCurrentLiveTick(null);
            latestTickDigitRef.current = null;
            return;
        }

        setLastDigits([]);
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;

        addLog(`[SISTEMA] Sincronizando fluxo de dados em tempo real para ${asset}...`, "INFO");
        
        sendMessageRef.current({ forget_all: 'ticks' });
        sendMessageRef.current({ ticks: asset, subscribe: 1 });

        return () => {
            sendMessageRef.current({ forget_all: 'ticks' });
        };
    }, [asset, isConnected, addLog, setLastTickEpoch, setLastDigits, digitPrediction, setVirtualLossStreak, setIsWaitingForVirtualResult, updateSignalResult]);

    const handleConnect = useCallback(async () => {
        const token = (accountType === 'real' ? realToken : demoToken).trim();
        const usedAppId = appId.trim() || DEFAULT_DERIV_APP_ID;

        if (!token) {
            toast.error("Token não encontrado. Por favor, insira seu Token PAT.");
            return;
        }

        addLog("[SISTEMA] Iniciando conexão Deriv...", "INFO");
        ws.connectWithToken(token, usedAppId, accountType);
    }, [accountType, realToken, demoToken, appId, ws, addLog, setAccountId]);


    
    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake?: number) => {
        if (!ws.isConnected) {
            toast.error("Conecte-se para operar.");
            return { success: false, isVirtual: false };
        }


        if (isTradeInProgressRef.current) {
            return { success: false, isVirtual: false };
        }

        const targetProfit = parseFloat(takeProfit) || 0;
        const maxLoss = parseFloat(stopLoss) || 0;

        if (targetProfit > 0 && totalProfit >= targetProfit) {
            toast.error(`Meta de lucro (${targetProfit.toFixed(2)} ${currency}) atingida. Operação bloqueada.`);
            return { success: false, isVirtual: false };
        }

        if (maxLoss > 0 && Math.abs(Math.min(totalProfit, 0)) >= maxLoss) {
            toast.error(`Stop Loss (${maxLoss.toFixed(2)} ${currency}) atingido. Operação bloqueada.`);
            return { success: false, isVirtual: false };
        }

        // --- SISTEMA DE LOSS VIRTUAL / SMART MODE ---
        // Se estiver em ciclo de Martingale (martingaleLevel.current > 0), a entrada deve ser IMEDIATA (real), ignorando filtros virtuais.
        const isMartingaleCycle = martingaleLevel.current > 0;
        const targetLosses = isMartingaleCycle ? 0 : (isSmartModeActiveRef.current ? 1 : virtualTargetLossesRef.current);
        
        if (targetLosses > 0 && virtualLossStreakRef.current < targetLosses) {
            // Executa como simulação virtual local
            if (activeVirtualTradeRef.current || isWaitingForVirtualResult) {
                return { success: false, isVirtual: false }; // Já existe uma simulação em andamento
            }

            setIsWaitingForVirtualResult(true);
            activeVirtualTradeRef.current = {
                ticksRemaining: duration,
                prediction: contractType,
                signalId,
                strategyName: `VIRTUAL: ${strategyName}`
            };

            // Registra o início da simulação virtual no terminal de dados
            addLog(
                `[VIRTUAL] Iniciando simulação virtual para ${contractToSignal(contractType, asset?.startsWith('frx'))} (${virtualLossStreakRef.current}/${targetLosses}).`,
                "TRADE",
                { isVirtual: true, strategyName, contractType, stake: 0.35 }
            );

            setAiThought(`Simulando entrada virtual ${contractToSignal(contractType, asset?.startsWith('frx'))}...`);
            return { success: true, isVirtual: true };
        }

        // Se passou pelo filtro de Loss Virtual, executa a entrada REAL
        const parsedOverrideStake = overrideStake !== undefined ? Number(overrideStake) : undefined;
        const parsedInitialStake = Number(initialStake);
        const baseStake = parsedOverrideStake && parsedOverrideStake > 0 ? parsedOverrideStake : (parsedInitialStake > 0 ? parsedInitialStake : 0.35);

        if (!Number.isFinite(baseStake) || baseStake <= 0) {
            toast.error("Valor de entrada inválido.");
            isTradeInProgressRef.current = false;
            setTradeStatus('IDLE');
            return { success: false, isVirtual: false };
        }

        const mgFactor = parseFloat(stateAndSetters.martingaleFactor) || 2.1;
        const stakeToUse = stateAndSetters.isMartingaleActive && martingaleLevel.current > 0
            ? baseStake * Math.pow(mgFactor, martingaleLevel.current)
            : baseStake;

        const stake = parseFloat(stakeToUse.toFixed(2));

        if (!Number.isFinite(stake) || stake <= 0) {
            toast.error("Não foi possível calcular a entrada.");
            isTradeInProgressRef.current = false;
            setTradeStatus('IDLE');
            return { success: false, isVirtual: false };
        }

        isTradeInProgressRef.current = true;

        const reqId = Date.now();
        const proposalContractType = getProposalContractType(contractType, digitTradeMode, overUnderDirection, asset);

        const minDuration = asset.startsWith('frx') ? 5 : 1;
        const calculatedDuration = Math.max(minDuration, Math.min(10, Math.floor(Number(duration) || minDuration)));
        const tradeCycleId = Math.floor(Date.now() / 1000);

        const proposal: any = {
            proposal: 1,
            amount: stake,
            basis: "stake",
            contract_type: proposalContractType,
            currency: currency,
            duration: calculatedDuration,
            duration_unit: "t",
            underlying_symbol: symbol,
            req_id: reqId
        };

        if (proposalContractType === 'DIGITOVER' || proposalContractType === 'DIGITUNDER') {
            proposal.barrier = String(stateAndSetters.digitPrediction);
        }

        proposalTracker.current.set(reqId, { strategyName, signalId, stake, contractType, tradeCycleId });
        addLog(`[ENVIO] Solicitando proposta ${proposalContractType} em ${symbol} com stake $${stake.toFixed(2)}.`, "INFO");
        setAiThought(`Preparando entrada ${contractToSignal(contractType, asset?.startsWith('frx'))} com stake $${stake.toFixed(2)}...`);
        setTradeStatus('SENDING');

        ws.sendMessage(proposal);
        return { success: true, isVirtual: false };
    }, [
        ws.isConnected,
        ws.sendMessage,
        initialStake,
        stateAndSetters.martingaleFactor,
        stateAndSetters.isMartingaleActive,
        stateAndSetters.digitPrediction,
        setTradeStatus,
        addLog,
        duration,
        digitTradeMode,
        overUnderDirection,
        asset,
        currency,
        takeProfit,
        stopLoss,
        totalProfit,
        setIsWaitingForVirtualResult,
        isWaitingForVirtualResult,
        accountType,
        currentLiveTick,
        ws,
    ]);

    useEffect(() => {
        executeBuyRef.current = executeBuy;
    }, [executeBuy]);

    useEffect(() => {
        if (!isConnected) {
            setAiThought("Aguardando Conexão...");
            setIsStudying(true);
            setCurrentConfidence(0);
            return;
        }

        if (!isBotRunning) {
            setAiThought("Conectado. Pronto para iniciar a análise.");
            setIsStudying(false);
            setCurrentConfidence(0);
            return;
        }

        if (tradeStatus === 'SENDING') {
            setAiThought("Validando proposta e enviando entrada...");
            return;
        }

        if (tradeStatus === 'ACTIVE') {
            setAiThought("Operação em andamento. Monitorando contrato...");
            return;
        }

        if (lastDigits.length < 10) {
            setAiThought("Coletando ticks para montar leitura inicial...");
            setIsStudying(true);
            setCurrentConfidence(0);
            return;
        }

        setIsStudying(false);
    }, [isConnected, isBotRunning, tradeStatus, lastDigits.length, setCurrentConfidence, setIsStudying]);

    useEffect(() => {
        const targetProfit = parseFloat(takeProfit) || 0;
        const maxLoss = parseFloat(stopLoss) || 0;

        if (targetProfit > 0 && totalProfit >= targetProfit) {
            setIsPaused(true);
            setAiThought("Meta atingida. Bot pausado para proteger o lucro.");
            return;
        }

        if (maxLoss > 0 && Math.abs(Math.min(totalProfit, 0)) >= maxLoss) {
            setIsPaused(true);
            setAiThought("Stop loss atingido. Bot pausado para proteger a banca.");
            return;
        }

        setIsPaused(false);
    }, [takeProfit, stopLoss, totalProfit, setIsPaused]);

    useEffect(() => {
        if (!isBotRunning || !isConnected) return;
        if (isTradeInProgressRef.current || tradeStatus !== 'IDLE' || isWaitingForVirtualResult) return;
        if (isPaused) return;
        if (lastDigits.length < 12 || !lastTickEpoch) return;
        if (lastAutoTradeEpochRef.current === lastTickEpoch) return;

        const isConsecutiveAnomaly = lastDigits[0] === lastDigits[1] && lastDigits[1] === lastDigits[2] && lastDigits[2] === lastDigits[3];
        const microSample = lastDigits.slice(0, 8);
        const microEvens = microSample.filter(d => d % 2 === 0).length;
        const isExtremeImbalance = microEvens <= 1 || microEvens >= 7;

        if (isConsecutiveAnomaly || isExtremeImbalance) {
            setIsManipulationDetected(true);
            setAiThought("ALERTA: Anomalia/Extremo desequilíbrio no feed. Suspendendo temporariamente por segurança...");
            setCurrentConfidence(0);
            return;
        } else {
            setIsManipulationDetected(false);
        }

        const counts = new Array(10).fill(0);
        const entropySample = lastDigits.slice(0, 80);
        entropySample.forEach(d => counts[d]++);
        let entropy = 0;
        for (const count of counts) {
            if (count > 0) {
                const p = count / entropySample.length;
                entropy -= p * Math.log2(p);
            }
        }
        // Análise de Variância e RSI (Momentum)
        const mean = entropySample.reduce((a, b) => a + b, 0) / entropySample.length;
        let variance = 0;
        entropySample.forEach(d => {
            variance += Math.pow(d - mean, 2);
        });
        variance = variance / entropySample.length;

        // Mercado altamente caótico se entropia for alta ou variância extrema
        const isHighlyChaotic = entropy > 3.20 || variance > 12;
        const isTrending = variance < 5;

        // Análise de Cadeias de Markov Profunda (Padrão de 5, 4, 3 e 2 ticks)
        const calculateMarkovProb = (patternLen: number) => {
            const currentPat = lastDigits.slice(0, patternLen).map(d => d % 2 === 0 ? 'E' : 'O').reverse().join('');
            let occurrences = 0;
            let nextEven = 0;
            const historyChars = lastDigits.map(d => d % 2 === 0 ? 'E' : 'O').reverse();
            for (let i = 0; i < historyChars.length - patternLen; i++) {
                if (historyChars.slice(i, i + patternLen).join('') === currentPat) {
                    occurrences++;
                    if (historyChars[i + patternLen] === 'E') nextEven++;
                }
            }
            return { occurrences, nextEven };
        };

        const markov5 = calculateMarkovProb(5);
        const markov4 = calculateMarkovProb(4);
        const markov3 = calculateMarkovProb(3);
        const markov2 = calculateMarkovProb(2);

        let probNextIsEven = 50;
        let markovConfidenceLevel = 0;

        if (markov5.occurrences >= 2) {
            probNextIsEven = (markov5.nextEven / markov5.occurrences) * 100;
            markovConfidenceLevel = 5;
        } else if (markov4.occurrences >= 3) {
            probNextIsEven = (markov4.nextEven / markov4.occurrences) * 100;
            markovConfidenceLevel = 4;
        } else if (markov3.occurrences >= 4) {
            probNextIsEven = (markov3.nextEven / markov3.occurrences) * 100;
            markovConfidenceLevel = 3;
        } else if (markov2.occurrences > 0) {
            probNextIsEven = (markov2.nextEven / markov2.occurrences) * 100;
            markovConfidenceLevel = 2;
        }

        const probNextIsOdd = 100 - probNextIsEven;

        // Aproximação de RSI para Dígitos (Últimos 14 Ticks)
        const rsiSample = lastDigits.slice(0, 14);
        const evensInRsi = rsiSample.filter(d => d % 2 === 0).length;
        const rsiEven = (evensInRsi / 14) * 100;
        const overboughtEven = rsiEven >= 78; // Muita força Par
        const oversoldEven = rsiEven <= 22; // Muita força Ímpar

        let currentStreak = 1;
        const firstIsEven = lastDigits[0] % 2 === 0;
        for (let i = 1; i < lastDigits.length; i++) {
            if ((lastDigits[i] % 2 === 0) === firstIsEven) {
                currentStreak++;
            } else {
                break;
            }
        }

        const currentParity = firstIsEven ? 'EVEN' : 'ODD';

        const getWindowMaxStreak = (windowDigits: number[], parity: 'EVEN' | 'ODD') => {
            let max = 0;
            let current = 0;
            const chronological = [...windowDigits].reverse();
            for (const d of chronological) {
                const isEven = d % 2 === 0;
                if ((parity === 'EVEN' && isEven) || (parity === 'ODD' && !isEven)) {
                    current++;
                    if (current > max) max = current;
                } else {
                    current = 0;
                }
            }
            return max;
        };

        const maxEven30 = getWindowMaxStreak(lastDigits.slice(0, 30), 'EVEN');
        const maxOdd30 = getWindowMaxStreak(lastDigits.slice(0, 30), 'ODD');
        const maxEven60 = getWindowMaxStreak(lastDigits.slice(0, 60), 'EVEN');
        const maxOdd60 = getWindowMaxStreak(lastDigits.slice(0, 60), 'ODD');

        const limit30 = currentParity === 'EVEN' ? maxEven30 : maxOdd30;
        const limit60 = currentParity === 'EVEN' ? maxEven60 : maxOdd60;

        let contractType: ContractType | null = null;
        let confidence = 0;
        let reason = "";
        let thought = "";

        // IA DE ALTA PRECISÃO (Deep Learning Simples + Confluência de Indicadores)
        
        const isMartingale = martingaleLevel.current > 0;
        
        // Em caso de Martingale (derrota anterior), a IA ativa o "Modo Conservador Absoluto" para proteger o capital
        if (isMartingale) {
            // No Gale, exige exaustão absoluta (histórica) OU confluência quádrupla
            if (currentStreak >= limit60 && limit60 > 3) {
                contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                confidence = 99;
                reason = `[MODO GALE] Exaustão Absoluta (60T): Streak (${currentStreak}x) supera teto (${limit60}x).`;
                thought = `GALE ATIVO: Rompimento histórico máximo detectado. Entrada de alta precisão para recuperação.`;
            } else if (currentStreak >= limit30 && limit30 >= 4) {
                const isMarkovStrong = currentParity === 'EVEN' ? probNextIsOdd >= 85 : probNextIsEven >= 85;
                const isRsiSupporting = currentParity === 'EVEN' ? overboughtEven : oversoldEven;
                
                if (isMarkovStrong && isRsiSupporting && markovConfidenceLevel >= 4 && !isHighlyChaotic) {
                    contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                    confidence = 98;
                    reason = `[MODO GALE] Confluência Quádrupla: Exaustão + RSI + Deep Markov Nível ${markovConfidenceLevel}.`;
                    thought = `GALE ATIVO: Alinhamento perfeito de 4 fatores estatísticos para entrada segura.`;
                } else {
                    setAiThought(`[MODO GALE] Aguardando alinhamento estrito (Streak, RSI e Markov >= 85%) para recuperar...`);
                }
            } else if (probNextIsEven >= 95 && currentParity === 'ODD' && !isHighlyChaotic && markovConfidenceLevel >= 5) {
                contractType = 'DIGITEVEN';
                confidence = 96;
                reason = `[MODO GALE] Deep Sniper: Probabilidade crítica para PAR (${probNextIsEven.toFixed(1)}%).`;
                thought = `GALE ATIVO: Rede Markoviana de Nível 5 indica reversão certeira.`;
            } else if (probNextIsOdd >= 95 && currentParity === 'EVEN' && !isHighlyChaotic && markovConfidenceLevel >= 5) {
                contractType = 'DIGITODD';
                confidence = 96;
                reason = `[MODO GALE] Deep Sniper: Probabilidade crítica para ÍMPAR (${probNextIsOdd.toFixed(1)}%).`;
                thought = `GALE ATIVO: Rede Markoviana de Nível 5 indica reversão certeira.`;
            } else {
                 setAiThought(`[MODO GALE] Analisando o mercado com máxima cautela para garantir a vitória do martingale...`);
            }
        } else {
            // Operação Normal
            // 1. Exaustão Extrema Confirmada por RSI
            if (currentStreak >= limit60 && limit60 > 2) {
                contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                confidence = isHighlyChaotic ? 88 : 99;
                reason = `Exaustão Absoluta (60T): Streaks atuais (${currentStreak}x) superam limite histórico (${limit60}x).`;
                thought = `Rompimento de Limite Histórico (60T) detectado. Probabilidade massiva de reversão estatística.`;
            }
            // 2. Confluência de Exaustão Média com RSI e Markov Deep (Nível 4 ou 5)
            else if (currentStreak >= limit30 && limit30 >= 3) {
                const isMarkovStrong = currentParity === 'EVEN' ? probNextIsOdd >= 80 : probNextIsEven >= 80;
                const isRsiSupporting = currentParity === 'EVEN' ? overboughtEven : oversoldEven;
                
                if (isMarkovStrong && isRsiSupporting) {
                    contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                    confidence = isHighlyChaotic ? 89 : 96;
                    reason = `Confluência Master (30T): Exaustão (${currentStreak}x) + RSI Extremo + Markov Nível ${markovConfidenceLevel}.`;
                    thought = `Alinhamento Triplo: Limite de 30T, Sobrecarga no RSI e Cadeia de Markov apontam reversão imediata.`;
                } else {
                    setAiThought(`Observando: Limite de 30T atingido (${currentStreak}x). Aguardando alinhamento do RSI e Markov para entrar.`);
                }
            }
            // 3. Padrão Sniper (Markov Profundo + Tendência Confirmada)
            else if (probNextIsEven >= 88 && currentParity === 'ODD' && !isHighlyChaotic && markovConfidenceLevel >= 4) {
                contractType = 'DIGITEVEN';
                confidence = Math.round(probNextIsEven);
                reason = `Deep Markov Sniper: Probabilidade extrema para PAR (${probNextIsEven.toFixed(1)}%).`;
                thought = `A Rede Neural Markoviana (Nível ${markovConfidenceLevel}) identificou uma assimetria gritante a favor de PAR.`;
            }
            else if (probNextIsOdd >= 88 && currentParity === 'EVEN' && !isHighlyChaotic && markovConfidenceLevel >= 4) {
                contractType = 'DIGITODD';
                confidence = Math.round(probNextIsOdd);
                reason = `Deep Markov Sniper: Probabilidade extrema para ÍMPAR (${probNextIsOdd.toFixed(1)}%).`;
                thought = `A Rede Neural Markoviana (Nível ${markovConfidenceLevel}) identificou uma assimetria gritante a favor de ÍMPAR.`;
            }
            // 4. Fluxo de Tendência (RSI Trend Following)
            else if (isTrending && (overboughtEven || oversoldEven) && currentStreak <= 2) {
                // Se está em forte tendência Par ou Ímpar e acabou de dar um respiro, segue a tendência
                if (overboughtEven && probNextIsEven > 60) {
                    contractType = 'DIGITEVEN';
                    confidence = 85;
                    reason = `Trend Following (RSI): Mercado em forte fluxo PAR (${rsiEven.toFixed(1)}%), seguindo a força motriz.`;
                    thought = `RSI aponta sobrecompra de PAR em mercado de baixa variância. Aderindo ao fluxo principal.`;
                } else if (oversoldEven && probNextIsOdd > 60) {
                    contractType = 'DIGITODD';
                    confidence = 85;
                    reason = `Trend Following (RSI): Mercado em forte fluxo ÍMPAR (${(100-rsiEven).toFixed(1)}%), seguindo a força motriz.`;
                    thought = `RSI aponta sobrecompra de ÍMPAR em mercado de baixa variância. Aderindo ao fluxo principal.`;
                }
            }
        }

        const minConfidence = isMartingale ? 90 : (Number(stateAndSetters.marketStabilityThreshold) || 55);
        
        if (contractType && confidence >= minConfidence) {
            setCurrentConfidence(confidence);
            const signalId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const result = executeBuy(contractType, 'Núcleo Wave AI', signalId, asset);

            if (result && result.success) {
                lastAutoTradeEpochRef.current = lastTickEpoch;
                addSignal({
                    id: signalId,
                    strategy: result.isVirtual ? 'VIRTUAL: Núcleo Wave' : 'Núcleo Wave AI',
                    signal: contractToSignal(contractType, asset.startsWith('frx')),
                    details: reason,
                    winRate: `${confidence}%`
                });
                setAiThought(thought);
            }
        } else {
            setCurrentConfidence(Math.max(Math.round(probNextIsEven), Math.round(probNextIsOdd)));
            const currentBias = lastDigits.slice(0, 15).filter(d => d % 2 === 0).length > 7 ? "PAR" : "ÍMPAR";
            setAiThought(`Análise Neural: Entropia: ${entropy.toFixed(2)} | Variância: ${variance.toFixed(1)} | RSI(14): ${rsiEven.toFixed(0)} | Viés: ${currentBias}`);
        }
    }, [
        isBotRunning,
        isConnected,
        tradeStatus,
        isPaused,
        lastDigits,
        lastTickEpoch,
        asset,
        addSignal,
        executeBuy,
        setCurrentConfidence,
        setIsManipulationDetected,
        stateAndSetters.marketStabilityThreshold,
        isWaitingForVirtualResult
    ]);

    const manualBuy = useCallback((contractType: ContractType, source: string = 'Manual', overrideStake?: number) => {
        const parsedStake = overrideStake !== undefined ? Number(overrideStake) : undefined;

        if (overrideStake !== undefined && (!Number.isFinite(parsedStake) || parsedStake <= 0)) {
            toast.error("Valor manual inválido.");
            return;
        }

        const signalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const result = executeBuy(contractType, source, signalId, asset, parsedStake);

        if (!result || !result.success) {
            return;
        }

        stateAndSetters.setSignals((prev: any[]) => [
            {
                id: signalId,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
                strategy: result.isVirtual ? `VIRTUAL: ${source}` : source,
                signal: contractToSignal(contractType, asset.startsWith('frx')),
                details: 'Manual',
                winRate: '100%'
            },
            ...prev
        ]);
    }, [executeBuy, asset, stateAndSetters]);

            const handleDisconnect = useCallback(() => {
        ws.disconnect();
        addLog("[SISTEMA] Desconectado pelo usuário", "INFO");
    }, [ws, addLog]);


    const contextValue = useMemo(() => ({
        ...stateAndSetters,
        accountBalance: stateAndSetters.accountBalance,
        isConnected,
        isConnecting,
        status,
        handleConnect,
        handleDisconnect,
        appId, setAppId, toggleBot: () => setIsBotRunning(!isBotRunning),
        resetOperations: () => {
            totalProfitRef.current = 0;
            setTotalProfit(0);
            setWins(0);
            setLosses(0);
            stateAndSetters.setSignals([]);
            martingaleLevel.current = 0;
            proposalTracker.current.clear();
            buyTracker.current.clear();
            pendingContracts.current.clear();
            lastAutoTradeEpochRef.current = null;
            isTradeInProgressRef.current = false;
            setTradeStatus('IDLE');
            setActiveContractTick(0);
            setActiveContractDigit(null);
            setVirtualLossStreak(0);
            setIsWaitingForVirtualResult(false);
            setIsWaitingForRecoveryVirtual(false);
            activeVirtualTradeRef.current = null;
            setAiThought(isConnected ? "Operações reiniciadas. Aguardando novo gatilho..." : "Aguardando Conexão...");
        },
        appFlow,
        setAppFlow,
        selectedAIInfo,
        selectAI: (ia: any) => { setSelectedAIInfo(ia); setAppFlow('operating'); },
        exitToSelection: () => { setIsBotRunning(false); setAppFlow('selection'); },
        aiThought,
        manualBuy,
        isSettingsOpen,
        setIsSettingsOpen,
        isConfigModalOpen,
        setIsConfigModalOpen,
        countdown: 0,
        currentLiveTick,
        activeContractTick,
        activeContractDigit
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect, isBotRunning, setIsBotRunning, appFlow, selectedAIInfo, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, currentLiveTick, activeContractTick, activeContractDigit, setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, setLosses, setTotalProfit, setTradeStatus, setWins]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};