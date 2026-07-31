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

const contractToSignal = (contractType: ContractType) => {
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
    overUnderDirection: 'OVER' | 'UNDER'
): ContractType => {
    if (requestedType === 'DIGITEVEN' || requestedType === 'DIGITODD') {
        if (digitTradeMode === 'overUnder') {
            return overUnderDirection === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
        }

        if (digitTradeMode === 'riseFall') {
            return requestedType === 'DIGITEVEN' ? 'CALL' : 'PUT';
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
        contract.exit_spot,
        contract.current_spot,
    ];

    const pipSize = contract.exit_tick?.pip_size ?? contract.pip_size;

    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
            let strVal = candidate.toString().trim();
            if (typeof candidate === 'number' && typeof pipSize === 'number') {
                strVal = candidate.toFixed(pipSize);
            }
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
        appId, setAccountId, duration, takeProfit, stopLoss, totalProfit,
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
    const proposalTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number, baseStake: number }>>(new Map());
    const buyTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number, baseStake: number }>>(new Map());
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
        baseStake?: number;
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
            stateAndSetters.setSignals((prev: any) => prev.filter((signal: any) => !pendingSignalIds.includes(signal.id)));
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
                baseStake: tracked.baseStake,
                subscriptionId: undefined
            };

            buyTracker.current.set(data.req_id, saved);
            proposalTracker.current.delete(data.req_id);

            sendMessageRef.current({
                buy: proposalId,
                price: tracked.stake,
                req_id: data.req_id
            });

            setAiThought(`Entrada confirmada. Executando ${contractToSignal(tracked.contractType)}...`);
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
                const currentSpot = contract.current_spot_display_value || contract.current_spot;
                if (currentSpot !== undefined && currentSpot !== null) {
                    const lastDigit = parseInt(currentSpot.toString().slice(-1), 10);
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
                    signal: contractToSignal(saved.contractType),
                    stake: saved.stake,
                    profit: profit,
                    result: result,
                    exitDigit: exitDigit
                });

                addLog(
                    `[RESULTADO] ${result} ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (Dígito: ${exitDigit})`,
                    result,
                    { exitDigit }
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
                
                // === AUTO-GALE MANUAL (Surfando a esticada) ===
                if (result === 'LOSS' && stateAndSetters.isMartingaleActive && saved.strategyName.toLowerCase().includes('manual')) {
                    const maxMg = parseInt(stateAndSetters.maxMartingales) || 3;
                    if (martingaleLevel.current <= maxMg) {
                        const isEvenOdd = saved.contractType === 'DIGITEVEN' || saved.contractType === 'DIGITODD';
                        let nextContractType = saved.contractType;
                        
                        // "caso de esticada suff seguir mercado nao ir contra"
                        if (isEvenOdd && exitDigit !== undefined) {
                            const marketIsEven = exitDigit % 2 === 0;
                            nextContractType = marketIsEven ? 'DIGITEVEN' : 'DIGITODD';
                        }
                        
                        setAiThought(`Iniciando Martingale nível ${martingaleLevel.current}... (Seguindo tendência)`);
                        addLog(`[AUTO-GALE] Preparando entrada ${nextContractType} (Nível ${martingaleLevel.current})`, "INFO");
                        
                        setTimeout(() => {
                            if (executeBuyRef.current) {
                                executeBuyRef.current(
                                    nextContractType, 
                                    `${saved.strategyName} (Gale ${martingaleLevel.current})`, 
                                    `gale-${Date.now()}`, 
                                    asset,
                                    saved.baseStake
                                );
                            }
                        }, 1200);
                    } else {
                        addLog(`[AUTO-GALE] Limite de Martingales atingido (${maxMg})`, "INFO");
                        martingaleLevel.current = 0;
                    }
                }
                
                return;

            }

            return;
        }

        if (data?.msg_type === 'tick' && data?.tick) {
            const tickSymbol = data.tick?.symbol;
            const tickValue = data.tick?.quote ?? data.tick?.display_value ?? data.tick?.tick;
            const pipSize = data.tick?.pip_size;
            let tickStr = String(tickValue);
            if (typeof tickValue === 'number' && typeof pipSize === 'number') {
                tickStr = tickValue.toFixed(pipSize);
            }
            const lastDigit = Number(tickStr.replace(/[^\d]/g, '').slice(-1));
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

                        // Registra o resultado virtual no terminal de dados de forma estilizada
                        addLog(
                            `[VIRTUAL] ${result === 'WIN' ? 'Vitória Virtual' : 'Perda Virtual'} (Dígito: ${exitDigit})`,
                            result,
                            { isVirtual: true, strategyName: virtualTrade.strategyName, contractType: virtualTrade.prediction, exitDigit }
                        );


                        let nextStreak = virtualLossStreakRef.current;
                        if (isWin) {
                            // Vitória Virtual: reseta a sequência de perdas virtuais
                            setVirtualLossStreak(0);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;
                            
                            updateSignalResult(virtualTrade.signalId, 'WIN', 0.35, 0.35, exitDigit);
                        } else {
                            // Perda Virtual: incrementa a sequência de perdas virtuais
                            nextStreak = virtualLossStreakRef.current + 1;
                            setVirtualLossStreak(nextStreak);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;

                            updateSignalResult(virtualTrade.signalId, 'LOSS', -0.35, 0.35, exitDigit);
                        }

                        // === MANUAL VIRTUAL LOSS CYCLE ===
                        const isManual = virtualTrade.strategyName.toLowerCase().includes('manual');
                        if (isManual) {
                            const targetLosses = isSmartModeActiveRef.current ? 1 : virtualTargetLossesRef.current;
                            if (nextStreak >= targetLosses && targetLosses > 0) {

                                // MET TARGET LOSSES! Enter real trade!
                                addLog(`[LOSS AUTOMÁTICO] Alvo atingido para entrada manual. Executando conta real...`, "INFO");
                                setTimeout(() => {
                                    if (executeBuyRef.current) {
                                        const realSignalId = `manual-real-${Date.now()}`;
                                        const r = executeBuyRef.current(
                                            virtualTrade.prediction, 
                                            virtualTrade.strategyName.replace('VIRTUAL: ', ''), 
                                            realSignalId, 
                                            asset, 
                                            virtualTrade.baseStake
                                        );
                                        
                                        if (r && r.success && !r.isVirtual) {
                                            // Adiciona o sinal real
                                            stateAndSetters.setSignals((prev: any) => [
                                                {
                                                    id: realSignalId,
                                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
                                                    type: 'Manual',
                                                    signal: contractToSignal(virtualTrade.prediction),
                                                    details: 'Loss automático atingido. Operação real iniciada.',
                                                    winRate: '-'
                                                },
                                                ...prev
                                            ].slice(0, 100));
                                        }
                                    }
                                }, 800);

                            } else if (targetLosses > 0) {
                                // NOT YET MET. Keep trying virtual!
                                addLog(`[LOSS AUTOMÁTICO] Entrada manual aguardando loss virtual (${nextStreak}/${targetLosses}). Tentando novamente...`, "INFO");
                                setTimeout(() => {
                                    if (executeBuyRef.current) {
                                        executeBuyRef.current(
                                            virtualTrade.prediction, 
                                            virtualTrade.strategyName.replace('VIRTUAL: ', ''), 
                                            `manual-virtual-${Date.now()}`, 
                                            asset, 
                                            virtualTrade.baseStake
                                        );
                                    }
                                }, 800);
                            }
                        }

                    }
                }
            }
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
        setVirtualLossStreak,
        digitPrediction,
        setCurrency,
        setIsWaitingForVirtualResult,
        setLastDigits,
        setLastTickEpoch
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
        setLastDigits([]);
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;

        if (isConnected && sendMessageRef.current) {
            addLog(`[SISTEMA] Solicitando fluxo de dados de ${asset}...`, "INFO");
            sendMessageRef.current({ ticks: asset, subscribe: 1 });
            // Não enviamos forget porque a Deriv gerencia assinaturas
        }

    }, [asset, isConnected, addLog]);

    const handleConnect = useCallback(() => {
        const token = (accountType === 'real' ? realToken : demoToken).trim();
        const usedAppId = appId.trim() || DEFAULT_DERIV_APP_ID;

        if (!token) {
            toast.error("Token não encontrado. Por favor, insira seu Token PAT.");
            return;
        }

        addLog(`[SISTEMA] Iniciando conexão ${accountType.toUpperCase()} com App ID ${usedAppId}...`, "INFO");
        ws.connectWithToken(token, usedAppId, accountType);
    }, [accountType, realToken, demoToken, appId, ws.connectWithToken, addLog]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake?: number) => {
        if (!ws.isConnected) {
            if (activeVirtualTradeRef.current || isWaitingForVirtualResult) {
                return { success: false, isVirtual: true };
            }

            const parsedStake = overrideStake !== undefined ? Number(overrideStake) : (Number(initialStake) || 0.35);
            setIsWaitingForVirtualResult(true);
            activeVirtualTradeRef.current = {
                ticksRemaining: duration,
                prediction: contractType,
                signalId,
                strategyName: `SIMULAÇÃO: ${strategyName}`,
                baseStake: parsedStake
            };

            addLog(
                `[SIMULAÇÃO] Operação em tempo real iniciada para ${contractToSignal(contractType)} (Duração: ${duration} ticks, Stake: $${parsedStake.toFixed(2)}).`,
                "TRADE",
                { isVirtual: true, strategyName, contractType, stake: parsedStake }
            );

            setAiThought(`Simulando entrada ${contractToSignal(contractType)} com dados em tempo real da Deriv...`);
            return { success: true, isVirtual: true };
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
                strategyName: `VIRTUAL: ${strategyName}`,
                baseStake: overrideStake
            };

            // Registra o início da simulação virtual no terminal de dados
            addLog(
                `[VIRTUAL] Iniciando simulação virtual para ${contractToSignal(contractType)} (${virtualLossStreakRef.current}/${targetLosses}).`,
                "TRADE",
                { isVirtual: true, strategyName, contractType, stake: 0.35 }
            );

            setAiThought(`Simulando entrada virtual ${contractToSignal(contractType)}...`);
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
        const proposalContractType = getProposalContractType(contractType, digitTradeMode, overUnderDirection);

        const calculatedDuration = Math.max(1, Math.min(10, Math.floor(Number(duration) || 1)));
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

        proposalTracker.current.set(reqId, { strategyName, signalId, stake, contractType, tradeCycleId, baseStake });
        addLog(`[ENVIO] Solicitando proposta ${proposalContractType} em ${symbol} com stake $${stake.toFixed(2)}.`, "INFO");
        setAiThought(`Preparando entrada ${contractToSignal(contractType)} com stake $${stake.toFixed(2)}...`);
        setTradeStatus('SENDING');

        ws.sendMessage(proposal);
        return { success: true, isVirtual: false };
    }, [
        ws,
        initialStake,
        stateAndSetters.martingaleFactor,
        stateAndSetters.isMartingaleActive,
        stateAndSetters.digitPrediction,
        setTradeStatus,
        addLog,
        duration,
        digitTradeMode,
        overUnderDirection,
        currency,
        takeProfit,
        stopLoss,
        totalProfit,
        setIsWaitingForVirtualResult,
        isWaitingForVirtualResult,
        tradeStatus,
        virtualTargetLosses,
        isSmartModeActive,
        lastTickEpoch,
        accountType,
        isConnected
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
        if (lastDigits.length < 30 || !lastTickEpoch) return;
        if (lastAutoTradeEpochRef.current === lastTickEpoch) return;

        // --- SISTEMA QUÂNTICO SUPER AVANÇADO ---
        // 1. Amostragem de Dados
        const window60 = lastDigits.slice(0, 60);
        const window30 = lastDigits.slice(0, 30);
        const window15 = lastDigits.slice(0, 15);
        const window5 = lastDigits.slice(0, 5);

        // 2. Volatilidade e Médias Móveis (SMA / Desvio Padrão)
        const mean30 = window30.reduce((a, b) => a + b, 0) / 30;
        const variance30 = window30.reduce((a, b) => a + Math.pow(b - mean30, 2), 0) / 30;
        const stdDev30 = Math.sqrt(variance30);

        // 3. Entropia Quântica (Medição de Caos)
        const counts = new Array(10).fill(0);
        window60.forEach(d => counts[d]++);
        let entropy = 0;
        for (const count of counts) {
            if (count > 0) {
                const p = count / window60.length;
                entropy -= p * Math.log2(p);
            }
        }

        // Filtro Anti-Manipulação Institucional relaxado para permitir mais entradas
        const isConsecutiveAnomaly = lastDigits[0] === lastDigits[1] && lastDigits[1] === lastDigits[2] && lastDigits[2] === lastDigits[3] && lastDigits[3] === lastDigits[4];
        if (isConsecutiveAnomaly || entropy > 3.4 || stdDev30 < 0.8) {
            setIsManipulationDetected(true);
            setAiThought("⚠️ Anomalia Quântica Extrema. Mercado paralisado. Protegendo capital...");
            setCurrentConfidence(0);
            return;
        } else {
            setIsManipulationDetected(false);
        }

        // 4. Confluência e Escoragem (Modo Agressivo)
        let contractType: ContractType | null = null;
        let confidence = 0;
        let reason = "";
        let thought = "";

        if (digitTradeMode === 'overUnder') {
            const pred = Number(stateAndSetters.digitPrediction) || 4;
            
            let overScore = 0;
            let underScore = 0;

            // Indicador 1: Trend de Curto Prazo (SMA 5) mais sensível
            const mean5 = window5.reduce((a, b) => a + b, 0) / 5;
            if (mean5 > pred + 0.5) overScore += 30;
            if (mean5 < pred - 0.5) underScore += 30;

            // Indicador 2: Pressão Histórica (Volume/Frequência) mais permissiva
            const freqOver = window30.filter(d => d > pred).length / 30;
            const freqUnder = window30.filter(d => d < pred).length / 30;
            if (freqOver > 0.5) overScore += 35;
            if (freqUnder > 0.5) underScore += 35;

            // Indicador 3: Reversão à Média (Bollinger Bands mais justa)
            if (lastDigits[0] > mean30 + stdDev30 * 1.2) {
                underScore += 45; // Forte repulsão para baixo
            }
            if (lastDigits[0] < mean30 - stdDev30 * 1.2) {
                overScore += 45; // Forte repulsão para cima
            }

            const maxScore = Math.max(overScore, underScore);
            
            if (overScore >= 55) { // Threshold reduzido de 65 para 55
                contractType = 'DIGITOVER';
                confidence = Math.min(99, overScore + 25);
                reason = `Aceleração Quântica OVER: (Score: ${overScore}).`;
                thought = `Alta Frequência: Breakout detectado. SMA5: ${mean5.toFixed(1)}`;
            } else if (underScore >= 55) {
                contractType = 'DIGITUNDER';
                confidence = Math.min(99, underScore + 25);
                reason = `Aceleração Quântica UNDER: (Score: ${underScore}).`;
                thought = `Alta Frequência: Breakdown detectado. SMA5: ${mean5.toFixed(1)}`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(`⚡ Modo Turbo: Analisando fluxo O/U (O: ${overScore} / U: ${underScore})`);
            }

        } else {
            // MODO PAR / ÍMPAR (Even / Odd)
            let evenScore = 0;
            let oddScore = 0;

            // Indicador 1: Cadeias de Markov (Previsão de Transição de Estado)
            let evensAfterEven = 0, oddsAfterEven = 0;
            let evensAfterOdd = 0, oddsAfterOdd = 0;
            
            for (let i = 1; i < 30; i++) {
                const currentIsEven = lastDigits[i - 1] % 2 === 0;
                const prevIsEven = lastDigits[i] % 2 === 0;
                
                if (prevIsEven) {
                    if (currentIsEven) evensAfterEven++;
                    else oddsAfterEven++;
                } else {
                    if (currentIsEven) evensAfterOdd++;
                    else oddsAfterOdd++;
                }
            }

            const lastIsEven = lastDigits[0] % 2 === 0;
            let probEven = 50, probOdd = 50;

            if (lastIsEven) {
                const total = evensAfterEven + oddsAfterEven;
                if (total > 0) {
                    probEven = (evensAfterEven / total) * 100;
                    probOdd = (oddsAfterEven / total) * 100;
                }
            } else {
                const total = evensAfterOdd + oddsAfterOdd;
                if (total > 0) {
                    probEven = (evensAfterOdd / total) * 100;
                    probOdd = (oddsAfterOdd / total) * 100;
                }
            }

            if (probEven > 55) evenScore += 30; // Threshold mais fácil
            if (probOdd > 55) oddScore += 30;

            // Indicador 2: Exaustão de Sequência (Streaks Históricas)
            let currentStreak = 1;
            for (let i = 1; i < window30.length; i++) {
                if ((window30[i] % 2 === 0) === lastIsEven) currentStreak++;
                else break;
            }

            const getWindowMaxStreak = (windowDigits, isEven) => {
                let max = 0, current = 0;
                for (let i = windowDigits.length - 1; i >= 0; i--) {
                    if ((windowDigits[i] % 2 === 0) === isEven) {
                        current++;
                        if (current > max) max = current;
                    } else current = 0;
                }
                return max;
            };

            const maxEven30 = getWindowMaxStreak(window30, true);
            const maxOdd30 = getWindowMaxStreak(window30, false);
            
            const limit = lastIsEven ? maxEven30 : maxOdd30;

            // Antecipa a exaustão para entrar mais rápido (limit - 2 em vez de limit - 1)
            if (currentStreak >= Math.max(2, limit - 2)) {
                if (lastIsEven) oddScore += 50;
                else evenScore += 50;
            }

            // Indicador 3: Viés de Volume Sensível
            const evensIn15 = window15.filter(d => d % 2 === 0).length;
            if (evensIn15 > 8) evenScore += 20;
            else if (evensIn15 < 7) oddScore += 20;

            // Indicador 4: Quebra Estrutural Quântica
            if (mean30 > 4.5 && lastIsEven) oddScore += 15;
            if (mean30 < 4.5 && !lastIsEven) evenScore += 15;

            const maxScore = Math.max(evenScore, oddScore);

            if (evenScore >= 55) {
                contractType = 'DIGITEVEN';
                confidence = Math.min(99, evenScore + 25);
                reason = `Disparo PAR: Score Agressivo (${evenScore}).`;
                thought = `Aceleração Neural: Gatilho de alta frequência acionado para PAR. Markov: ${probEven.toFixed(0)}%`;
            } else if (oddScore >= 55) {
                contractType = 'DIGITODD';
                confidence = Math.min(99, oddScore + 25);
                reason = `Disparo ÍMPAR: Score Agressivo (${oddScore}).`;
                thought = `Aceleração Neural: Gatilho de alta frequência acionado para ÍMPAR. Markov: ${probOdd.toFixed(0)}%`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(`⚡ Modo Turbo: Analisando distorções P/I (P: ${evenScore} / I: ${oddScore})`);
            }
        }

        const minConfidence = Math.min(50, Number(stateAndSetters.marketStabilityThreshold) || 50); // Reduzido min de 55 pra 50
        
        if (contractType && confidence >= minConfidence) {
            setCurrentConfidence(confidence);
            const signalId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const result = executeBuy(contractType, 'Módulo Super Quântico', signalId, asset);

            if (result && result.success) {
                lastAutoTradeEpochRef.current = lastTickEpoch;
                addSignal({
                    id: signalId,
                    strategy: result.isVirtual ? 'VIRTUAL: Módulo Super Quântico Turbo' : 'Módulo Super Quântico Turbo',
                    signal: contractToSignal(contractType),
                    details: reason,
                    winRate: `${confidence}%`
                });
                setAiThought(thought);
            }
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
        isWaitingForVirtualResult,
        digitTradeMode,
        stateAndSetters.digitPrediction
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

        stateAndSetters.setSignals((prev: any) => [
            {
                id: signalId,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
                strategy: result.isVirtual ? `VIRTUAL: ${source}` : source,
                signal: contractToSignal(contractType),
                details: 'Manual',
                winRate: '100%'
            },
            ...prev
        ]);
    }, [executeBuy, asset, stateAndSetters]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters,
        isConnected,
        isConnecting,
        status,
        handleConnect,
        handleDisconnect: ws.disconnect,
        toggleBot: () => setIsBotRunning(!isBotRunning),
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
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, ws.disconnect, isBotRunning, setIsBotRunning, appFlow, selectedAIInfo, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, currentLiveTick, activeContractTick, activeContractDigit, setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, setLosses, setTotalProfit, setTradeStatus, setWins]);

        useEffect(() => {
        if (tradeStatus !== 'IDLE') {
            const timer = setTimeout(() => {
                if (isTradeInProgressRef.current || tradeStatus !== 'IDLE') {
                    addLog("[TIMEOUT] A corretora não respondeu a tempo. Reiniciando status...", "ERROR");
                    clearPendingTradeState();
                    isTradeInProgressRef.current = false;
                }
            }, 60000); // 60s timeout de segurança
            return () => clearTimeout(timer);
        }
    }, [tradeStatus, addLog, clearPendingTradeState]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};