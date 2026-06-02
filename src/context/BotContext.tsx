"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType, SignalEntry } from '@/types/bot';
import { toast } from "sonner";

const BotContext = createContext<any>(undefined);

const SCANNER_ASSETS = [
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: 'R_100', label: 'Volatility 100' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_10', label: 'Volatility 10' },
];

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
    const [aiThought, setAiThought] = useState("Sincronizando I.A...");
    const [isConnecting, setIsConnecting] = useState(false);
    const [assetRankings, setAssetRankings] = useState<any[]>([]);

    // Estados globais para controle de modais
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const accumulatedLoss = useRef(0.00); // Prejuízo acumulado no ciclo atual de Gale
    const consecutiveWins = useRef(0);
    const lastWinProfit = useRef(0.00);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isGalePausedForFilter = useRef(false);
    const isManualSession = useRef(false); // Controla se a sessão atual foi iniciada manualmente

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    
    // Ref para armazenar o histórico de preços reais para análise de Sobe/Desce (Rise/Fall)
    const pricesRef = useRef<Record<string, number[]>>({});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        asset, setAsset, initialStake, setInitialStake,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, setAccountType, realToken, demoToken,
        takeProfit, setTakeProfit, stopLoss, setStopLoss, martingaleFactor, setMartingaleFactor,
        maxLevels, setMaxLevels, isMartingaleActive, setIsMartingaleActive,
        isSorosActive, setIsSorosActive, sorosLevels, setSorosLevels,
        sorosProfitPercentage, setSorosProfitPercentage,
        setDuration, duration,
        setNeuralPredictions,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        isSmartModeActive, setIsSmartModeActive,
        accountBalance,
        
        // Resultados Separados
        realTotalProfit, setRealTotalProfit,
        demoTotalProfit, setDemoTotalProfit,
        realWins, setRealWins,
        demoWins, setDemoWins,
        realLosses, setRealLosses,
        demoLosses, setDemoLosses,
        realSignals, setRealSignals,
        demoSignals, setDemoSignals,

        // Banca Separada
        realInitialBankroll, setRealInitialBankroll,
        demoInitialBankroll, setDemoInitialBankroll,
        realDailyGoalPercent, setRealDailyGoalPercent,
        demoDailyGoalPercent, setDemoDailyGoalPercent,
        realDailyStopPercent, setRealDailyStopPercent,
        demoDailyStopPercent, setDemoDailyStopPercent,
        realCurrentDay, setRealCurrentDay,
        demoCurrentDay, setDemoCurrentDay,
        realActualBankroll, setRealActualBankroll,
        demoActualBankroll, setDemoActualBankroll,
        realBankHistory, setRealBankHistory,
        demoBankHistory, setDemoBankHistory,

        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
        // Sequência Automática
        autoSequenceActive, setAutoSequenceActive,
        autoSequenceTrigger, setAutoSequenceTrigger,
        autoSequenceEntry, setAutoSequenceEntry,
        generateSignalId,

        // Novos estados de manipulação
        isManipulationDetected, setIsManipulationDetected,
        manipulationScore, setManipulationScore
    } = stateAndSetters;

    // --- MAPEAMENTO DINÂMICO DE ESTADOS (REAL VS DEMO) ---
    const isReal = accountType === 'real';

    const totalProfit = isReal ? realTotalProfit : demoTotalProfit;
    const wins = isReal ? realWins : demoWins;
    const losses = isReal ? realLosses : demoLosses;
    const signals = isReal ? realSignals : demoSignals;

    const bankManagementInitialBankroll = isReal ? realInitialBankroll : demoInitialBankroll;
    const bankManagementDailyGoalPercent = isReal ? realDailyGoalPercent : demoDailyGoalPercent;
    const bankManagementDailyStopPercent = isReal ? realDailyStopPercent : demoDailyStopPercent;
    const bankManagementCurrentDay = isReal ? realCurrentDay : demoCurrentDay;
    const bankManagementActualBankroll = isReal ? realActualBankroll : demoActualBankroll;
    const bankManagementHistory = isReal ? realBankHistory : demoBankHistory;

    // Sincroniza a referência de lucro com o estado ativo ao mudar de conta
    useEffect(() => {
        totalProfitRef.current = isReal ? realTotalProfit : demoTotalProfit;
    }, [accountType, isReal, realTotalProfit, demoTotalProfit]);

    // Setters dinâmicos que atualizam a conta correta
    const setTotalProfit = useCallback((val: number) => {
        if (isReal) setRealTotalProfit(val);
        else setDemoTotalProfit(val);
    }, [isReal, setRealTotalProfit, setDemoTotalProfit]);

    const setWins = useCallback((val: number | ((prev: number) => number)) => {
        if (isReal) setRealWins(val);
        else setDemoWins(val);
    }, [isReal, setRealWins, setDemoWins]);

    const setLosses = useCallback((val: number | ((prev: number) => number)) => {
        if (isReal) setRealLosses(val);
        else setDemoLosses(val);
    }, [isReal, setRealLosses, setDemoLosses]);

    const setSignals = useCallback((val: SignalEntry[] | ((prev: SignalEntry[]) => SignalEntry[])) => {
        if (isReal) setRealSignals(val);
        else setDemoSignals(val);
    }, [isReal, setRealSignals, setDemoSignals]);

    const setBankManagementInitialBankroll = useCallback((val: string) => {
        if (isReal) setRealInitialBankroll(val);
        else setDemoInitialBankroll(val);
    }, [isReal, setRealInitialBankroll, setDemoInitialBankroll]);

    const setBankManagementDailyGoalPercent = useCallback((val: string) => {
        if (isReal) setRealDailyGoalPercent(val);
        else setDemoDailyGoalPercent(val);
    }, [isReal, setRealDailyGoalPercent, setDemoDailyGoalPercent]);

    const setBankManagementDailyStopPercent = useCallback((val: string) => {
        if (isReal) setRealDailyStopPercent(val);
        else setDemoDailyStopPercent(val);
    }, [isReal, setRealDailyStopPercent, setDemoDailyStopPercent]);

    const setBankManagementCurrentDay = useCallback((val: number | ((prev: number) => number)) => {
        if (isReal) setRealCurrentDay(val);
        else setDemoCurrentDay(val);
    }, [isReal, setRealCurrentDay, setDemoCurrentDay]);

    const setBankManagementActualBankroll = useCallback((val: string) => {
        if (isReal) setRealActualBankroll(val);
        else setDemoActualBankroll(val);
    }, [isReal, setRealActualBankroll, setDemoActualBankroll]);

    const setBankManagementHistory = useCallback((val: any | ((prev: any) => any)) => {
        if (isReal) setRealBankHistory(val);
        else setDemoBankHistory(val);
    }, [isReal, setRealBankHistory, setDemoBankHistory]);

    const addSignal = useCallback((signal: Omit<SignalEntry, 'timestamp' | 'id'>) => {
        const newSignal: SignalEntry = { ...signal, id: generateSignalId(), timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }) };
        setSignals(prev => [newSignal, ...prev].slice(0, 100));
        return newSignal.id;
    }, [setSignals, generateSignalId]);

    const updateSignalResult = useCallback((id: string, result: 'WIN' | 'LOSS', profit: number, stake: number | undefined, exitDigit?: number) => {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, result, profit, stake, exitDigit } : s));
    }, [setSignals]);

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    const calculateEntropy = (digits: number[]) => {
        if (digits.length < 20) return 1;
        const counts = new Array(10).fill(0);
        digits.slice(0, 50).forEach(d => counts[d]++);
        const probs = counts.map(c => c / 50).filter(p => p > 0);
        return -probs.reduce((sum, p) => sum + p * Math.log2(p), 0) / 3.32;
    };

    // --- ALGORITMO DE DETECÇÃO DE MANIPULAÇÃO DE MERCADO ---
    const detectMarketManipulation = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        const prices = pricesRef.current[symbol] || [];
        if (digits.length < 20) return { score: 0, isManipulated: false };

        let score = 0;

        // 1. Repetição Anormal de Dígitos (Broker Spike)
        // Se o mesmo dígito se repete consecutivamente (ex: 3 vezes seguidas)
        let maxConsecutiveSameDigit = 1;
        let currentConsecutive = 1;
        for (let i = 1; i < 10; i++) {
            if (digits[i] === digits[i - 1]) {
                currentConsecutive++;
                maxConsecutiveSameDigit = Math.max(maxConsecutiveSameDigit, currentConsecutive);
            } else {
                currentConsecutive = 1;
            }
        }
        if (maxConsecutiveSameDigit >= 3) score += 40; // Altíssimo risco de manipulação de tick
        else if (maxConsecutiveSameDigit === 2) score += 10;

        // 2. Desequilíbrio Extremo de Paridade (Bias)
        const recentDigits = digits.slice(0, 15);
        const evens = recentDigits.filter(d => d % 2 === 0).length;
        const odds = 15 - evens;
        const biasRatio = Math.abs(evens - odds) / 15;
        if (biasRatio >= 0.73) score += 35; // Mais de 85% de um lado só em 15 ticks
        else if (biasRatio >= 0.60) score += 15;

        // 3. Micro-Tendências Artificiais (Preço em linha reta)
        if (prices.length >= 8) {
            let consecutiveUps = 0;
            let consecutiveDowns = 0;
            for (let i = 1; i < 7; i++) {
                if (prices[i] > prices[i-1]) consecutiveUps++;
                else if (prices[i] < prices[i-1]) consecutiveDowns++;
            }
            if (consecutiveUps >= 6 || consecutiveDowns >= 6) score += 25; // Preço subindo/descendo sem parar
        }

        const isManipulated = score >= 70;
        
        if (symbol === asset) {
            setManipulationScore(score);
            setIsManipulationDetected(isManipulated);
        }

        return { score, isManipulated };
    }, [multiAssetDigits, asset, setManipulationScore, setIsManipulationDetected]);

    const getMarketState = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 50) return { confidence: 0, entropy: 1, recommendedVirtualLosses: 1, recommendedDirection: 'AGAINST', isStable: false };
        
        const evens = digits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const entropy = calculateEntropy(digits);
        const confidence = Math.floor((70 + (bias * 30)) * (1.2 - (entropy * 0.2)));
        
        // Integração com o detector de manipulação
        const { isManipulated, score: manipScore } = detectMarketManipulation(symbol);

        let recVirtual = 1;
        if (isManipulated) {
            recVirtual = 4; // Força o filtro virtual máximo se houver manipulação
        } else if (entropy > 0.96) {
            recVirtual = 3;
        } else if (entropy > 0.92) {
            recVirtual = 2;
        } else if (bias > 0.18) {
            recVirtual = 0;
        } else {
            recVirtual = 1;
        }

        const recDirection = bias > 0.22 ? 'FAVOR' : 'AGAINST';
        const isStable = !isManipulated && entropy < 0.88 && bias < 0.25;

        if (symbol === asset) setCurrentConfidence(Math.min(99, confidence));
        
        return { confidence, entropy, recommendedVirtualLosses: recVirtual, recommendedDirection: recDirection, isStable };
    }, [multiAssetDigits, asset, detectMarketManipulation]);

    const fetchDerivHistory = useCallback((symbol: string) => {
        if (!sendMessageRef.current) return;
        sendMessageRef.current({ ticks_history: symbol, count: 500, end: "latest", style: "ticks" });
    }, []);

    useEffect(() => { 
        if (isConnected) {
            SCANNER_ASSETS.forEach(item => {
                sendMessageRef.current({ ticks: item.value, subscribe: 1 });
                fetchDerivHistory(item.value);
            });
        }
    }, [isConnected, fetchDerivHistory]);

    const [virtualTradePending, setVirtualTradePending] = useState<any>(null);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const price = parseFloat(tick.quote);
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
        // Salva o histórico de preços reais
        if (!pricesRef.current[symbol]) {
            pricesRef.current[symbol] = [];
        }
        pricesRef.current[symbol] = [price, ...pricesRef.current[symbol]].slice(0, 100);

        setMultiAssetDigits((prev: Record<string, number[]>) => {
            const currentHistory = prev[symbol] || [];
            const newHistory = [lastDigit, ...currentHistory].slice(0, 500);
            if (symbol === asset) {
                setLastDigits(newHistory);
                setLastTickEpoch(tick.epoch);
            }
            return { ...prev, [symbol]: newHistory };
        });

        const { recommendedVirtualLosses } = getMarketState(symbol);

        if (virtualTradePending && virtualTradePending.symbol === symbol) {
            let win = false;
            if (virtualTradePending.contract === 'DIGITEVEN') {
                win = lastDigit % 2 === 0;
            } else if (virtualTradePending.contract === 'DIGITODD') {
                win = lastDigit % 2 !== 0;
            } else if (virtualTradePending.contract === 'DIGITUNDER') {
                win = lastDigit < (virtualTradePending.barrier || 8);
            }

            if (win) {
                setVirtualLossStreak(0);
                updateSignalResult(virtualTradePending.signalId, 'WIN', 0, 0, lastDigit);
                setAiThought(`Refração em ${symbol}. Reiniciando proteção.`);
            } else {
                const nextStreak = virtualLossStreak + 1;
                setVirtualLossStreak(nextStreak);
                updateSignalResult(virtualTradePending.signalId, 'LOSS', 0, 0, lastDigit);
                
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                if (nextStreak >= target) {
                    setAiThought(`Proteção atingida em ${symbol}. Liberando Sniper!`);
                    if (isGalePausedForFilter.current && symbol === lastTradedAsset.current) {
                        isGalePausedForFilter.current = false;
                    }
                } else {
                    setAiThought(`Filtro Anti-Manipulação: +${target - nextStreak} Loss Virtual.`);
                }
            }
            setVirtualTradePending(null);
        }

        if (isStudying && symbol === asset) {
            setStudyTicksCount((c: number) => {
                const next = c + 1;
                if (next >= 5) {
                    setIsStudying(false);
                    return 0;
                }
                return next;
            });
        }
    }, [asset, getMarketState, isStudying, setIsStudying, setStudyTicksCount, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, updateSignalResult]);

    // --- SCANNER DE ATIVOS EM TEMPO REAL (100 A 10) ---
    // Analisa todos os ativos e gera um ranking de estabilidade e assertividade
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            const rankings = SCANNER_ASSETS.map(item => {
                const state = getMarketState(item.value);
                const manip = detectMarketManipulation(item.value);
                
                // Score de Operabilidade: Confiança menos a taxa de manipulação
                const score = Math.max(0, state.confidence - manip.score);

                return {
                    symbol: item.value,
                    label: item.label,
                    score,
                    confidence: state.confidence,
                    manipulationScore: manip.score,
                    isStable: state.isStable && !manip.isManipulated,
                    isManipulated: manip.isManipulated
                };
            }).sort((a, b) => b.score - a.score);

            setAssetRankings(rankings);

            // REMOVED: Auto-switch is disabled as requested. The bot will lock on the selected asset.
            // O robô agora opera exclusivamente no mercado selecionado pelo usuário, sem alternar sozinho.
        }, 8000); // Atualiza a cada 8 segundos para evitar oscilações frenéticas

        return () => clearInterval(interval);
    }, [isConnected, isBotRunning, getMarketState, detectMarketManipulation, asset, setAsset]);

    // Função auxiliar para salvar o dia concluído no histórico persistente
    const saveDayToHistory = useCallback((status: 'win' | 'loss', profit: number) => {
        const currentDay = bankManagementCurrentDay;
        const initialBankroll = parseFloat(bankManagementActualBankroll) || 0;
        const finalBankroll = initialBankroll + profit;

        const newHistoryItem = {
            day: currentDay,
            initial: initialBankroll,
            final: finalBankroll,
            profit: profit,
            status: status,
            date: new Date().toLocaleDateString('pt-BR')
        };

        setBankManagementHistory((prev: any) => {
            // Evita duplicar o mesmo dia
            const filtered = prev.filter((item: any) => item.day !== currentDay);
            return [...filtered, newHistoryItem].sort((a, b) => a.day - b.day);
        });

        // Atualiza o saldo real da planilha e avança o dia
        setBankManagementActualBankroll(finalBankroll.toFixed(2));
        setBankManagementCurrentDay(currentDay + 1);
    }, [bankManagementCurrentDay, bankManagementActualBankroll, setBankManagementHistory, setBankManagementActualBankroll, setBankManagementCurrentDay]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        accumulatedLoss.current = 0.00;
        consecutiveWins.current = 0;
        lastWinProfit.current = 0.00;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        setAiThought("Bot Parado.");
        addLog(reason, 'INFO');
    }, [setIsBotRunning, addLog, setTradeStatus]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        martingaleLevel.current = 0;
        accumulatedLoss.current = 0.00;
        consecutiveWins.current = 0;
        lastWinProfit.current = 0.00;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        addLog("Resetado.", "INFO");
    }, [setTotalProfit, setWins, setLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus]);

    const toggleBot = useCallback(() => {
        if (!isConnected) {
            toast.error("Conecte-se primeiro.");
            return;
        }
        if (isBotRunning) {
            stopBot("Sniper Pausado");
        } else { 
            setIsBotRunning(true); 
            resetOperations();
            setIsStudying(true);
            setAiThought("Varrendo ativos por manipulação...");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Sincronizado`, color: 'bg-emerald-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                sendMessageRef.current({ balance: 1, subscribe: 1 });
            } else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) setAccountBalance(parseFloat(data.balance.balance));
            } else if (data?.msg_type === 'history') {
                const history = data.history;
                const symbol = data.echo_req.ticks_history;
                if (history && symbol) {
                    const prices = history.prices || [];
                    const digits = prices.map((p: number) => {
                        const lastDigit = parseInt(String(p).replace(/[^\d.]/g, '').slice(-1));
                        return isNaN(lastDigit) ? 0 : lastDigit;
                    });
                    
                    pricesRef.current[symbol] = [...prices].reverse().slice(0, 100);
                    
                    setMultiAssetDigits((prev: Record<string, number[]>) => ({
                        ...prev,
                        [symbol]: [...digits].reverse().slice(0, 500)
                    }));
                    
                    if (symbol === asset) {
                        setLastDigits([...digits].reverse().slice(0, 500));
                    }
                }
            } else if (data?.msg_type === 'tick') {
                processTickData(data.tick);
            } else if (data?.msg_type === 'buy') {
                if (data.buy) { 
                    const signalId = data.echo_req.passthrough?.signalId;
                    if (signalId) {
                        pendingContracts.current.set(data.buy.contract_id, {
                            signalId,
                            stake: data.echo_req.price,
                            symbol: data.echo_req.parameters.symbol,
                            barrier: data.echo_req.passthrough?.barrier
                        });
                    }
                    setTradeStatus('ACTIVE'); 
                    sendMessageRef.current({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
                }
            } else if (data?.msg_type === 'proposal_open_contract') {
                const contract = data.proposal_open_contract;
                if (contract?.is_sold) {
                    const savedData = pendingContracts.current.get(contract.contract_id);
                    if (savedData) {
                        const isLoss = contract.status === 'lost';
                        const profitValue = parseFloat(contract.profit);
                        const exitDigit = contract.exit_tick ? parseInt(String(contract.exit_tick).slice(-1)) : undefined;

                        totalProfitRef.current += profitValue;
                        setTotalProfit(totalProfitRef.current);

                        // Adiciona o log detalhado no terminal de dados
                        addLog(isLoss ? "Derrota" : "Vitória", isLoss ? "LOSS" : "WIN", { 
                            profit: profitValue, 
                            stake: savedData.stake, 
                            exitDigit, 
                            contractType: lastContractType.current, 
                            barrier: savedData.barrier 
                        });

                        if (isLoss) {
                            setLosses((prev: number) => prev + 1);
                            martingaleLevel.current += 1;
                            consecutiveWins.current = 0;
                            lastWinProfit.current = 0.00;
                            
                            // Se atingiu o limite máximo de gales configurado
                            if (martingaleLevel.current > maxLevels) {
                                martingaleLevel.current = 0;
                                accumulatedLoss.current = 0.00;
                                isGalePausedForFilter.current = false;
                                if (isManualSession.current) {
                                    isManualSession.current = false;
                                    stopBot("Limite de Martingale atingido na operação manual.");
                                } else {
                                    addLog("Limite de Martingale atingido. Resetando para stake inicial.", "INFO");
                                }
                            } else {
                                // Para a recuperação inteligente, mantemos o fluxo direto e imediato
                                setAiThought("Recuperação inteligente ativada: Dígito abaixo de 8.");
                            }
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            accumulatedLoss.current = 0.00; // Reseta prejuízo acumulado ao vencer
                            isGalePausedForFilter.current = false;
                            setVirtualLossStreak(0);
                            
                            // --- GESTÃO DE SOROS AUTOMÁTICO ---
                            if (isSorosActive) {
                                consecutiveWins.current += 1;
                                lastWinProfit.current = profitValue;
                                if (consecutiveWins.current >= sorosLevels) {
                                    // Ciclo de Soros concluído com sucesso! Reseta para o início
                                    consecutiveWins.current = 0;
                                    lastWinProfit.current = 0.00;
                                    setAiThought("Ciclo Soros Concluído! Lucro consolidado com sucesso.");
                                } else {
                                    setAiThought(`Soros Nível ${consecutiveWins.current + 1} Ativado para a próxima entrada.`);
                                }
                            } else {
                                setAiThought("Operação Neutralizada com Sucesso.");
                            }

                            // Se era uma sessão manual, para o bot de forma inteligente após a vitória
                            if (isManualSession.current) {
                                isManualSession.current = false;
                                stopBot("Operação manual finalizada com vitória.");
                            }
                        }

                        updateSignalResult(savedData.signalId, isLoss ? 'LOSS' : 'WIN', profitValue, savedData.stake, exitDigit);
                        activeTrades.current.delete(savedData.signalId);
                        pendingContracts.current.delete(contract.contract_id);
                        setTradeStatus('IDLE'); 

                        // --- SALVAMENTO AUTOMÁTICO DE BANCA ---
                        if (totalProfitRef.current >= parseFloat(takeProfit)) {
                            saveDayToHistory('win', totalProfitRef.current);
                            stopBot(`Meta batida! Dia concluído e salvo.`);
                        } else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) {
                            saveDayToHistory('loss', totalProfitRef.current);
                            stopBot(`Stop Loss atingido. Dia concluído e salvo.`);
                        }
                    }
                }
            }
        } else if (event.type === 'auth_error') {
            setIsConnecting(false);
            setIsConnected(false);
            setStatus({ message: 'Erro de Autenticação', color: 'bg-red-500' });
        } else if (event.type === 'error') {
            setIsConnecting(false);
            setStatus({ message: 'Erro de Conexão', color: 'bg-red-500' });
        } else if (event.type === 'close') {
            setIsConnecting(false);
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, getMarketState, maxLevels, asset, isSorosActive, sorosLevels, saveDayToHistory, addLog]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // --- SISTEMA DE MEMÓRIA COGNITIVA DA I.A (PATTERN MATCHING HISTÓRICO) ---
    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 50) return null;

        // --- RECUPERAÇÃO INTELIGENTE (MARTINGALE ABAIXO DE 8) ---
        // Se estiver em Gale, muda o contrato para Dígito Abaixo de 8 (DIGITUNDER com barreira 8)
        const isRecoveryActive = martingaleLevel.current > 0 && lastTradedAsset.current === symbol;
        if (isRecoveryActive) {
            return { 
                type: 'UNDER', 
                contract: 'DIGITUNDER', 
                barrier: 8,
                name: 'Recovery (Abaixo de 8)', 
                confidence: 99, 
                symbol 
            };
        }

        if (isGalePausedForFilter.current && symbol === lastTradedAsset.current) return null;

        // --- ESTRATÉGIA 3: SEQUÊNCIA AUTOMÁTICA PERSONALIZADA ---
        if (autoSequenceActive && symbol === asset && autoSequenceTrigger) {
            const triggerArray = autoSequenceTrigger.split(',').map(s => s.trim().toUpperCase());
            const len = triggerArray.length;
            if (digits.length >= len) {
                const recentDigitsChronological = digits.slice(0, len).reverse();
                const currentParities = recentDigitsChronological.map(d => d % 2 === 0 ? 'E' : 'O');
                const match = triggerArray.every((val, idx) => val === currentParities[idx]);

                if (match) {
                    return {
                        type: autoSequenceEntry,
                        contract: autoSequenceEntry === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
                        name: `Seq: ${autoSequenceTrigger}`,
                        confidence: 99,
                        symbol
                    };
                }
            }
        }

        if (autoSequenceActive) return null;

        // --- DETECÇÃO DE SURFE (SURF THE WAVE - A FAVOR DO MERCADO) ---
        // Se os últimos 3 dígitos tiverem a mesma paridade, a I.A identifica uma onda forte (tendência).
        // Em vez de bloquear, ela entra A FAVOR da onda para surfar a tendência.
        const last3Parities = digits.slice(0, 3).map(d => d % 2 === 0 ? 'E' : 'O');
        const isSurf = last3Parities.every(p => p === last3Parities[0]);
        if (isSurf) {
            const waveParity = last3Parities[0];
            setAiThought(`Onda forte detectada [${last3Parities.join('-')}]. Surfando a tendência de ${waveParity === 'E' ? 'PAR' : 'ÍMPAR'}!`);
            return {
                type: waveParity === 'E' ? 'EVEN' : 'ODD',
                contract: waveParity === 'E' ? 'DIGITEVEN' : 'DIGITODD',
                name: 'I.A Surfista (A Favor)',
                confidence: 94,
                symbol
            };
        }

        // --- BLOQUEIO DE ZIG-ZAG (ANTI-CHOPPY) ---
        // Se o mercado estiver alternando perfeitamente (ex: Par -> Ímpar -> Par), o mercado está sem tendência (lateralizado/choppy).
        // A I.A bloqueia a entrada para evitar ser estopada na quebra da alternância.
        const isAlternating = last3Parities[0] !== last3Parities[1] && last3Parities[1] !== last3Parities[2];
        if (isAlternating) {
            setAiThought(`Mercado lateralizado (Zig-Zag) [${last3Parities.reverse().join('->')}]. Aguardando formação de onda.`);
            return null;
        }

        // --- MODO 1: MEMÓRIA DE PARIDADE (PAR/ÍMPAR) ---
        // A I.A analisa a sequência de paridade dos últimos 3 dígitos e busca na memória de 500 dígitos o que costuma acontecer em seguida.
        const currentParityPattern = digits.slice(0, 3).map(d => d % 2 === 0 ? 'E' : 'O').reverse().join('');
        let parityMatches = 0;
        let nextEvenCount = 0;
        let nextOddCount = 0;

        const historyParities = digits.map(d => d % 2 === 0 ? 'E' : 'O').reverse();
        for (let i = 0; i < historyParities.length - 4; i++) {
            const pattern = historyParities.slice(i, i + 3).join('');
            if (pattern === currentParityPattern) {
                parityMatches++;
                const next = historyParities[i + 3];
                if (next === 'E') nextEvenCount++;
                else nextOddCount++;
            }
        }

        // Se houver pelo menos 5 ocorrências idênticas no histórico, calcula a probabilidade
        if (parityMatches >= 5) {
            const evenProbability = nextEvenCount / parityMatches;
            const oddProbability = nextOddCount / parityMatches;

            if (evenProbability >= 0.62) {
                setAiThought(`Memória I.A: Padrão [${currentParityPattern}] tem ${Math.round(evenProbability * 100)}% de chance de PAR.`);
                return {
                    type: 'EVEN',
                    contract: 'DIGITEVEN',
                    name: 'I.A Memória (Par)',
                    confidence: Math.round(evenProbability * 100),
                    symbol
                };
            }
            if (oddProbability >= 0.62) {
                setAiThought(`Memória I.A: Padrão [${currentParityPattern}] tem ${Math.round(oddProbability * 100)}% de chance de ÍMPAR.`);
                return {
                    type: 'ODD',
                    contract: 'DIGITODD',
                    name: 'I.A Memória (Ímpar)',
                    confidence: Math.round(oddProbability * 100),
                    symbol
                };
            }
        }

        return null;
    }, [multiAssetDigits, isStudying, autoSequenceActive, autoSequenceTrigger, autoSequenceEntry, asset]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, bypassStudy = false, customBarrier?: number) => {
        if (!isConnected || (!bypassStudy && isStudying) || activeTrades.current.size > 0) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        
        let stakeToUse = baseStake;
        let barrierToUse = customBarrier;

        // 1. Se estiver em Martingale (Recuperação de perda)
        if (martingaleLevel.current > 0) {
            // Se for recuperação abaixo de 8, calcula o stake dinamicamente para recuperar o prejuízo acumulado
            if (contractType === 'DIGITUNDER' && barrierToUse === 8) {
                stakeToUse = accumulatedLoss.current / 0.235;
                // Garante um valor mínimo de stake (ex: 0.35)
                if (stakeToUse < 0.35) stakeToUse = 0.35;
            } else {
                stakeToUse = baseStake * Math.pow(mgFactor, martingaleLevel.current);
            }
        } 
        // 2. Se estiver em Soros (Alavancagem de vitória)
        else if (isSorosActive && consecutiveWins.current > 0 && consecutiveWins.current <= sorosLevels) {
            stakeToUse = baseStake + (lastWinProfit.current * (sorosProfitPercentage / 100));
        }

        // Registra o stake atual no prejuízo acumulado antes de enviar a ordem
        if (martingaleLevel.current === 0) {
            accumulatedLoss.current = stakeToUse;
        } else {
            accumulatedLoss.current += stakeToUse;
        }

        const params: any = { 
            amount: parseFloat(stakeToUse.toFixed(2)), 
            basis: 'stake', 
            contract_type: contractType, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol 
        };

        if (barrierToUse !== undefined) {
            params.barrier = String(barrierToUse);
        }

        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName, barrier: barrierToUse } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying, isSorosActive, sorosLevels, sorosProfitPercentage]);

    // Função para compra manual (usada por botões)
    const manualBuy = useCallback((contractType: ContractType, source: string = 'Manual') => {
        if (!isConnected) {
            toast.error("Conecte-se primeiro.");
            return;
        }
        
        // Ativa a sessão manual inteligente
        isManualSession.current = true;
        setIsStudying(false); // Sempre aborta o estudo para entrada manual imediata
        
        if (!isBotRunning) {
            setIsBotRunning(true);
            setAiThought("Entrada manual detectada. Monitorando recuperação inteligente...");
        }

        const sId = addSignal({ 
            strategy: source, 
            signal: contractType === 'DIGITEVEN' ? 'EVEN' : 'ODD', 
            details: `Entrada manual via ${source}`, 
            winRate: '100%' 
        });
        executeBuy(contractType, source, sId, asset, true); // Passa bypassStudy = true para garantir execução imediata
    }, [isConnected, isBotRunning, setIsBotRunning, setIsStudying, setAiThought, addSignal, executeBuy, asset]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS.map(a => a.value)) {
            const signal = calculateTradeSignal(symbol);
            if (signal) {
                const { recommendedVirtualLosses } = getMarketState(symbol);
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                const isRecovery = signal.name.includes('Recovery');
                // Se for recuperação, NUNCA espera por perdas virtuais! Executa imediatamente!
                const needsVirtual = !isRecovery && target > 0 && virtualLossStreak < target;
                
                if (needsVirtual) {
                    if (!virtualTradePending) {
                        const sId = addSignal({ 
                            strategy: `VIRTUAL (IA: ${target}L)`, 
                            signal: signal.type as any, 
                            details: `Filtro dinâmico em ${symbol}`, 
                            winRate: `${signal.confidence}%` 
                        });
                        setVirtualTradePending({ ...signal, signalId: sId, symbol });
                    }
                    break;
                }
                
                if (activeTrades.current.size === 0) {
                    const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: isRecovery ? `Recuperação Sniper em ${symbol}` : `Sniper Real em ${symbol}`, winRate: `${signal.confidence}%` });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol, false, (signal as any).barrier);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, getMarketState, lastTickEpoch]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            setIsConnecting(true);
            if (isConnected) { 
                disconnect(); 
                setTimeout(() => {
                    connect(token, type);
                }, 600);
            }
            else connect(token, type);
        }
    }, [accountType, realToken, demoToken, connect, disconnect, isConnected]);

    const selectAI = useCallback((ia: any) => { 
        setSelectedAIInfo(ia); 
        setActiveStrategy(ia.id); 
        setAppFlow('operating'); 
    }, [setActiveStrategy]);

    const exitToSelection = useCallback(() => { 
        stopBot("Sessão Finalizada"); 
        setAppFlow('selection'); 
    }, [stopBot]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought,
        manualBuy, isSettingsOpen, setIsSettingsOpen, isConfigModalOpen, setIsConfigModalOpen, saveDayToHistory, assetRankings,
        
        // Expondo dinamicamente os estados ativos
        totalProfit, wins, losses, signals,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent, bankManagementDailyStopPercent,
        bankManagementCurrentDay, bankManagementActualBankroll, bankManagementHistory,
        setTotalProfit, setWins, setLosses, setSignals,
        setBankManagementInitialBankroll, setBankManagementDailyGoalPercent, setBankManagementDailyStopPercent,
        setBankManagementCurrentDay, setBankManagementActualBankroll, setBankManagementHistory
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, saveDayToHistory, assetRankings,
        totalProfit, wins, losses, signals,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent, bankManagementDailyStopPercent,
        bankManagementCurrentDay, bankManagementActualBankroll, bankManagementHistory,
        setTotalProfit, setWins, setLosses, setSignals,
        setBankManagementInitialBankroll, setBankManagementDailyGoalPercent, setBankManagementDailyStopPercent,
        setBankManagementCurrentDay, setBankManagementActualBankroll, setBankManagementHistory
    ]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};