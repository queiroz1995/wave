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


// --- INDICATORS HELPER ---
const calcSMA = (data: number[], period: number) => {
    if (data.length < period) return 0;
    return data.slice(0, period).reduce((a, b) => a + b, 0) / period;
};

const calcEMA = (data: number[], period: number) => {
    if (data.length < period) return 0;
    const k = 2 / (period + 1);
    let ema = data[period - 1];
    for (let i = period - 2; i >= 0; i--) {
        ema = (data[i] * k) + (ema * (1 - k));
    }
    return ema;
};

const calcRSI = (data: number[], period: number) => {
    if (data.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 0; i < period; i++) {
        const diff = data[i] - data[i + 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const calcMACD = (data: number[], fast: number, slow: number, signalPeriod: number) => {
    if (data.length < slow + signalPeriod) return { macd: 0, signal: 0, hist: 0 };
    // Not a full MACD for full history, just approx for the latest point
    const emaFast = calcEMA(data, fast);
    const emaSlow = calcEMA(data, slow);
    const macdLine = emaFast - emaSlow;
    // We would need a history of MACD to calculate EMA of MACD for signal. 
    // We will just do SMA of macd for simplicity on digits.
    let macdHist = [];
    for(let i=0; i<signalPeriod; i++) {
        const ef = calcEMA(data.slice(i), fast);
        const es = calcEMA(data.slice(i), slow);
        macdHist.push(ef - es);
    }
    const signalLine = calcSMA(macdHist, signalPeriod);
    return { macd: macdLine, signal: signalLine, hist: macdLine - signalLine };
};
// --- END INDICATORS ---

const getProposalContractType = (
    requestedType: ContractType,
    digitTradeMode: 'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal',
    overUnderDirection: 'OVER' | 'UNDER',
    asset: string
): ContractType => {
    const isDigitSupported = asset.startsWith('1HZ') || asset.startsWith('R_') || asset.startsWith('JD');

    if (requestedType === 'DIGITEVEN' || requestedType === 'DIGITODD') {
        if (!isDigitSupported) {
            return requestedType === 'DIGITEVEN' ? 'CALL' : 'PUT';
        }

        if (digitTradeMode === 'overUnder') {
            return overUnderDirection === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
        }

        if (digitTradeMode === 'riseFall') {
            return requestedType === 'DIGITEVEN' ? 'CALL' : 'PUT';
        }
    }

    if ((requestedType === 'DIGITOVER' || requestedType === 'DIGITUNDER') && !isDigitSupported) {
         return requestedType === 'DIGITOVER' ? 'CALL' : 'PUT';
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
        addLog, setAccountBalance, setLastDigits, multiMarketDigits, setMultiMarketDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, setAsset, initialStake, addSignal, updateSignalResult,
        setLastTickEpoch, lastDigits, lastTickEpoch,
        setTradeStatus, tradeStatus, isBotRunning, isPaused,
        accountType, realToken, demoToken,
        appId, setAccountId, duration, takeProfit, setTakeProfit, stopLoss, setStopLoss, totalProfit, accountBalance,
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

            if (Number.isFinite(lastDigit)) {
                // console.log("Received tick for", tickSymbol, lastDigit);
                if (['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100'].includes(tickSymbol)) {
                    setMultiMarketDigits(prev => {
                        const current = prev[tickSymbol] || [];
                        return { ...prev, [tickSymbol]: [lastDigit, ...current].slice(0, 100) };
                    });
                }

                if (tickSymbol === asset) {
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

            } // fechar o if (tickSymbol === asset) que eu abri
        if (data?.msg_type === 'balance' && data.balance?.balance !== undefined) {
            setAccountBalance(parseFloat(data.balance.balance));
            if (data.balance.currency) {
                setCurrency(data.balance.currency);
            }
        }

        if (data?.error) {
            const errorCode = data.error?.code;
            if (errorCode === 'AlreadySubscribed' || errorCode === 'InvalidSymbol' || errorCode === 'RateLimit') {
                console.warn("Ignorando erro de tick não-crítico:", data.error.message);
                return;
            }
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
    const subscribedMarketsRef = useRef<Set<string>>(new Set());
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
        // DO NOT clear setMultiMarketDigits({}) to preserve other markets during asset switch
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;

        if (isConnected && ws.sendMessage) {
            const ALL_MARKETS = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100'];
            
            // Subscribe to main asset immediately if not already subscribed
            if (!subscribedMarketsRef.current.has(asset)) {
                addLog(`[SISTEMA] Solicitando fluxo de dados de ${asset}...`, "INFO");
                ws.sendMessage({ ticks: asset, subscribe: 1 });
                subscribedMarketsRef.current.add(asset);
            }

            // Slowly subscribe to others
            ALL_MARKETS.forEach((m, i) => {
                if (!subscribedMarketsRef.current.has(m)) {
                    setTimeout(() => {
                        if (ws.sendMessage) {
                            console.log("Subscribing to market for radar:", m);
                            ws.sendMessage({ ticks: m, subscribe: 1 });
                            subscribedMarketsRef.current.add(m);
                        }
                    }, 1000 + i * 500);
                }
            });
        }
    }, [asset, isConnected, addLog, ws.sendMessage]);
    
    // Clear subscriptions on disconnect
    useEffect(() => {
        if (!isConnected) {
            subscribedMarketsRef.current.clear();
        }
    }, [isConnected]);

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
        const proposalContractType = getProposalContractType(contractType, digitTradeMode, overUnderDirection, symbol);

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

        if (lastDigits.length < 5) {
            setAiThought("Coletando ticks para montar leitura inicial...");
            setIsStudying(true);
            setCurrentConfidence(0);
            return;
        }

        setIsStudying(false);
    }, [isConnected, isBotRunning, tradeStatus, lastDigits.length, setCurrentConfidence, setIsStudying]);

    // Gestão Automática de Banca na Memória da IA
    useEffect(() => {
        const balanceNum = typeof accountBalance === 'number' ? accountBalance : parseFloat(String(accountBalance || '0'));
        if (balanceNum > 0) {
            const currentTP = parseFloat(takeProfit);
            const currentSL = parseFloat(stopLoss);
            if (!currentTP || currentTP <= 0) {
                setTakeProfit((balanceNum * 0.05).toFixed(2));
            }
            if (!currentSL || currentSL <= 0) {
                setStopLoss((balanceNum * 0.15).toFixed(2));
            }
        }
    }, [accountBalance, takeProfit, stopLoss, setTakeProfit, setStopLoss]);

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

    const evaluateMarketOpportunity = useCallback((
        symbol: string,
        digits: number[],
        tradeMode: 'evenOdd' | 'overUnder',
        digitPred: number,
        ouDirection: 'OVER' | 'UNDER',
        strategyConfig: any
    ) => {
        if (!digits || digits.length < 5) {
            return { symbol, contractType: null, confidence: 0, score: 0, reason: '', thought: '' };
        }

        const window60 = digits.slice(0, 60);
        const window30 = digits.slice(0, 30);
        const window15 = digits.slice(0, 15);
        const len30 = Math.max(1, window30.length);

        const mean30 = window30.reduce((a, b) => a + b, 0) / len30;
        const variance30 = window30.reduce((a, b) => a + Math.pow(b - mean30, 2), 0) / len30;
        const stdDev30 = Math.sqrt(variance30);

        let contractType: ContractType | null = null;
        let confidence = 0;
        let score = 0;
        let reason = "";
        let thought = "";

        const activeInd = strategyConfig?.activeIndicators || [];
        const rsiVal = activeInd.includes('RSI') ? calcRSI(digits, strategyConfig?.rsiPeriod || 14) : 50;
        const macdVal = activeInd.includes('MACD') ? calcMACD(digits, strategyConfig?.macdFast || 12, strategyConfig?.macdSlow || 26, strategyConfig?.macdSignal || 9) : { macd: 0, signal: 0, hist: 0 };
        const maVal = activeInd.includes('MA') ? (strategyConfig?.maType === 'EMA' ? calcEMA(digits, strategyConfig?.maPeriod || 50) : calcSMA(digits, strategyConfig?.maPeriod || 50)) : 4.5;

        if (tradeMode === 'overUnder') {
            const pred = Number(digitPred) || 4;
            let overScore = 0;
            let underScore = 0;

            if (activeInd.length > 0) {
                if (activeInd.includes('RSI')) {
                    if (rsiVal < (strategyConfig?.rsiOversold || 30)) overScore += 40;
                    if (rsiVal > (strategyConfig?.rsiOverbought || 70)) underScore += 40;
                }
                if (activeInd.includes('MACD')) {
                    if (macdVal.hist > 0) overScore += 30;
                    if (macdVal.hist < 0) underScore += 30;
                }
                if (activeInd.includes('MA')) {
                    if (digits[0] > maVal) overScore += 20;
                    if (digits[0] < maVal) underScore += 20;
                }
            } else {
                const mean5 = calcSMA(digits, 5);
                if (mean5 > pred + 0.5) overScore += 30;
                if (mean5 < pred - 0.5) underScore += 30;

                const freqOver = window30.filter(d => d > pred).length / len30;
                const freqUnder = window30.filter(d => d < pred).length / len30;
                if (freqOver > 0.5) overScore += 35;
                if (freqUnder > 0.5) underScore += 35;

                if (digits[0] > mean30 + stdDev30 * 1.2) underScore += 45;
                if (digits[0] < mean30 - stdDev30 * 1.2) overScore += 45;
            }

            score = Math.max(overScore, underScore);

            if (overScore >= 55) {
                contractType = 'DIGITOVER';
                confidence = Math.min(99, overScore + 25);
                reason = `[${symbol}] Aceleração Quântica OVER (Score: ${overScore}).`;
                thought = `Radar Quântico (${symbol}): Fluxo de alta detectado em O/U.`;
            } else if (underScore >= 55) {
                contractType = 'DIGITUNDER';
                confidence = Math.min(99, underScore + 25);
                reason = `[${symbol}] Aceleração Quântica UNDER (Score: ${underScore}).`;
                thought = `Radar Quântico (${symbol}): Fluxo de baixa detectado em O/U.`;
            } else {
                contractType = overScore >= underScore ? 'DIGITOVER' : 'DIGITUNDER';
                confidence = Math.min(99, score + 20);
                reason = `[${symbol}] Tendência O/U (Over: ${overScore} / Under: ${underScore}).`;
                thought = `Radar Quântico (${symbol}): Analisando fluxo O/U.`;
            }
        } else {
            // EVEN / ODD
            let evenScore = 0;
            let oddScore = 0;

            let evensAfterEven = 0, oddsAfterEven = 0;
            let evensAfterOdd = 0, oddsAfterOdd = 0;

            for (let i = 1; i < Math.min(30, digits.length); i++) {
                const currentIsEven = digits[i - 1] % 2 === 0;
                const prevIsEven = digits[i] % 2 === 0;
                if (prevIsEven) {
                    if (currentIsEven) evensAfterEven++;
                    else oddsAfterEven++;
                } else {
                    if (currentIsEven) evensAfterOdd++;
                    else oddsAfterOdd++;
                }
            }

            const lastIsEven = digits[0] % 2 === 0;
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

            if (probEven > 55) evenScore += 30;
            if (probOdd > 55) oddScore += 30;

            let currentStreak = 1;
            for (let i = 1; i < window30.length; i++) {
                if ((window30[i] % 2 === 0) === lastIsEven) currentStreak++;
                else break;
            }

            let maxStreak = 0, curr = 0;
            for (let i = window30.length - 1; i >= 0; i--) {
                if ((window30[i] % 2 === 0) === lastIsEven) {
                    curr++;
                    if (curr > maxStreak) maxStreak = curr;
                } else curr = 0;
            }

            if (currentStreak >= Math.max(2, maxStreak - 2)) {
                if (lastIsEven) oddScore += 50;
                else evenScore += 50;
            }

            const evensIn15 = window15.filter(d => d % 2 === 0).length;
            if (evensIn15 > 8) evenScore += 20;
            else if (evensIn15 < 7) oddScore += 20;

            if (mean30 > 4.5 && lastIsEven) oddScore += 15;
            if (mean30 < 4.5 && !lastIsEven) evenScore += 15;

            score = Math.max(evenScore, oddScore);

            if (evenScore >= 55) {
                contractType = 'DIGITEVEN';
                confidence = Math.min(99, evenScore + 25);
                reason = `[${symbol}] Disparo PAR: Score Radar (${evenScore}).`;
                thought = `Radar Quântico (${symbol}): Oportunidade detectada para PAR (Markov ${probEven.toFixed(0)}%).`;
            } else if (oddScore >= 55) {
                contractType = 'DIGITODD';
                confidence = Math.min(99, oddScore + 25);
                reason = `[${symbol}] Disparo ÍMPAR: Score Radar (${oddScore}).`;
                thought = `Radar Quântico (${symbol}): Oportunidade detectada para ÍMPAR (Markov ${probOdd.toFixed(0)}%).`;
            } else {
                contractType = evenScore >= oddScore ? 'DIGITEVEN' : 'DIGITODD';
                confidence = Math.min(99, score + 20);
                reason = `[${symbol}] Viés P/I (Par: ${evenScore} / Ímpar: ${oddScore}).`;
                thought = `Radar Quântico (${symbol}): Analisando viés estatístico.`;
            }
        }

        return {
            symbol,
            contractType,
            confidence,
            score,
            reason,
            thought
        };
    }, []);

    useEffect(() => {
        if (!isBotRunning || !isConnected) return;
        if (isTradeInProgressRef.current || tradeStatus !== 'IDLE' || isWaitingForVirtualResult) return;
        if (isPaused) return;
        if (!lastTickEpoch) return;
        if (lastAutoTradeEpochRef.current === lastTickEpoch) return;

        const ALL_MARKETS = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

        let bestOpp: ReturnType<typeof evaluateMarketOpportunity> | null = null;
        let highestScore = -1;

        for (const mSymbol of ALL_MARKETS) {
            const mDigits = (multiMarketDigits && multiMarketDigits[mSymbol]) || (mSymbol === asset ? lastDigits : []);
            if (!mDigits || mDigits.length < 5) continue;

            const evalRes = evaluateMarketOpportunity(
                mSymbol,
                mDigits,
                digitTradeMode,
                Number(digitPrediction) || 4,
                overUnderDirection,
                stateAndSetters.strategyConfig
            );

            if (evalRes.score > highestScore || !bestOpp) {
                highestScore = evalRes.score;
                bestOpp = evalRes;
            }
        }

        if (!bestOpp || !bestOpp.contractType) return;

        // --- REGRA DE RECUPERAÇÃO IMEDIATA APÓS LOSS ---
        const isRecoveryCycle = martingaleLevel.current > 0;
        
        const targetContract = bestOpp.contractType;
        let targetConfidence = bestOpp.confidence;
        let targetReason = bestOpp.reason;
        let targetThought = bestOpp.thought;

        if (isRecoveryCycle) {
            // Se estiver em recuperação (Loss anterior), ENTRA IMEDIATAMENTE no próximo tick sem esperar padrão
            targetConfidence = 99;
            targetReason = `⚡ [RECUPERAÇÃO IMEDIATA - MARTINGALE LVL ${martingaleLevel.current}] Entrada de recuperação acionada em ${bestOpp.symbol} sem aguardar novo padrão.`;
            targetThought = `⚡ RECUPERAÇÃO DE LOSS: Entrada imediata acionada em ${bestOpp.symbol} para recuperar a banca.`;
        }

        const minConfidence = isRecoveryCycle ? 0 : Math.min(50, Number(stateAndSetters.marketStabilityThreshold) || 50);

        if (targetConfidence >= minConfidence) {
            setCurrentConfidence(targetConfidence);
            const signalId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            
            // Troca o ativo selecionado na UI para o mercado de melhor oportunidade
            if (bestOpp.symbol !== asset && setAsset) {
                setAsset(bestOpp.symbol);
            }

            const result = executeBuy(targetContract, isRecoveryCycle ? 'Recuperação Imediata Martingale' : 'Radar Quântico Multi-Mercado', signalId, bestOpp.symbol);

            if (result && result.success) {
                lastAutoTradeEpochRef.current = lastTickEpoch;
                addSignal({
                    id: signalId,
                    strategy: isRecoveryCycle 
                        ? `⚡ RECUPERAÇÃO MARTINGALE (${bestOpp.symbol})` 
                        : (result.isVirtual ? `VIRTUAL: Radar Multi-Mercado (${bestOpp.symbol})` : `Radar Multi-Mercado (${bestOpp.symbol})`),
                    signal: contractToSignal(targetContract),
                    details: targetReason,
                    winRate: `${targetConfidence}%`
                });
                setAiThought(targetThought);
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
        setAsset,
        addSignal,
        executeBuy,
        setCurrentConfidence,
        setIsManipulationDetected,
        stateAndSetters.marketStabilityThreshold,
        stateAndSetters.strategyConfig,
        isWaitingForVirtualResult,
        digitTradeMode,
        digitPrediction,
        overUnderDirection,
        multiMarketDigits,
        evaluateMarketOpportunity
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
        sendMessage: ws.sendMessage,
        
        toggleBot: () => setIsBotRunning(!isBotRunning),
        multiMarketDigits,
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
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, ws.disconnect, isBotRunning, setIsBotRunning, appFlow, selectedAIInfo, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, currentLiveTick, activeContractTick, activeContractDigit, setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, setLosses, setTotalProfit, setTradeStatus, setWins, multiMarketDigits]);

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