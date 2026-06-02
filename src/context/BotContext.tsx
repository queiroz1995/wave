"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';
import { toast } from "sonner";

const BotContext = createContext<any>(undefined);

const SCANNER_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'R_10', label: 'Volatility 10' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_100', label: 'Volatility 100' },
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

    // Estados globais para controle de modais
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const consecutiveWins = useRef(0);
    const lastWinProfit = useRef(0.00);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isManualSession = useRef(false); // Controla se a sessão atual foi iniciada manualmente

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    
    // Ref para armazenar o histórico de preços reais para análise
    const pricesRef = useRef<Record<string, number[]>>({});

    // --- NOVO SISTEMA DE LOSS VIRTUAL AVANÇADO ---
    const [virtualHistory, setVirtualHistory] = useState<('WIN' | 'LOSS')[]>([]);
    
    // Mapa para gerenciar múltiplos sinais virtuais pendentes por ativo simultaneamente
    const pendingVirtualSignals = useRef<Map<string, any>>(new Map());

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, setAsset, initialStake, setInitialStake, addSignal, updateSignalResult,
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
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        isSmartModeActive, setIsSmartModeActive,
        setSignals, accountBalance, wins, losses,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
        // Sequência Automática
        autoSequenceActive, setAutoSequenceActive,
        autoSequenceTrigger, setAutoSequenceTrigger,
        autoSequenceEntry, setAutoSequenceEntry,
        // Loss Virtual Toggle
        isVirtualLossActive, setIsVirtualLossActive,
        virtualTargetLosses, setVirtualTargetLosses,
        // Estratégias Salvas
        savedCustomStrategies, setSavedCustomStrategies
    } = stateAndSetters;

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

    const getMarketState = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (digits.length < 50) return { confidence: 0, entropy: 1, recommendedVirtualLosses: 1, recommendedDirection: 'AGAINST', isStable: false };
        
        const evens = digits.slice(0, 50).filter(d => d % 2 === 0).length;
        const odds = 50 - evens;
        const bias = Math.abs(evens - odds) / 50;
        const entropy = calculateEntropy(digits);
        const confidence = Math.floor((70 + (bias * 30)) * (1.2 - (entropy * 0.2)));
        
        let recVirtual = 1;
        if (entropy > 0.96) recVirtual = 4;
        else if (entropy > 0.92) recVirtual = 3;
        else if (entropy > 0.86) recVirtual = 2;
        else if (bias > 0.18) recVirtual = 0;
        else recVirtual = 1;

        const recDirection = bias > 0.22 ? 'FAVOR' : 'AGAINST';
        const isStable = entropy < 0.88 && bias < 0.25;

        if (symbol === asset) setCurrentConfidence(Math.min(99, confidence));
        
        return { confidence, entropy, recommendedVirtualLosses: recVirtual, recommendedDirection: recDirection, isStable };
    }, [multiAssetDigits, asset]);

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

    // Resolve o sinal virtual anterior com base no tick atual
    const evaluateVirtualSignal = useCallback((symbol: string, currentPrice: number, currentDigit: number, trade: any) => {
        let isWin = false;

        switch (trade.contractType) {
            case 'DIGITEVEN':
                isWin = currentDigit % 2 === 0;
                break;
            case 'DIGITODD':
                isWin = currentDigit % 2 !== 0;
                break;
            case 'DIGITOVER':
                isWin = currentDigit > digitPrediction;
                break;
            case 'DIGITUNDER':
                isWin = currentDigit < digitPrediction;
                break;
        }

        const outcome: 'WIN' | 'LOSS' = isWin ? 'WIN' : 'LOSS';
        const virtualProfit = isWin ? 0.31 : -0.35;

        // Atualiza o sinal na interface para mostrar o resultado em tempo real!
        updateSignalResult(trade.signalId, outcome, virtualProfit, 0.35, currentDigit);
        
        setVirtualHistory(prev => {
            const next: ('WIN' | 'LOSS')[] = [...prev, outcome].slice(-10); // Mantém os últimos 10 resultados virtuais
            
            // Verifica se os últimos `virtualTargetLosses` resultados virtuais são exatamente LOSS
            const len = next.length;
            const isPatternMatched = len >= virtualTargetLosses && 
                                     next.slice(-virtualTargetLosses).every(outcome => outcome === 'LOSS');
            
            if (isPatternMatched) {
                setAiThought(`Padrão de ${virtualTargetLosses} derrotas virtuais seguidas detectado! Próxima entrada será REAL.`);
            } else {
                setAiThought(`Aguardando ${virtualTargetLosses} derrotas virtuais seguidas. Histórico: ${next.map(h => h === 'WIN' ? 'W' : 'L').join(' ')}`);
            }
            
            return next;
        });

        pendingVirtualSignals.current.delete(symbol);
    }, [digitPrediction, updateSignalResult, virtualTargetLosses]);

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

        // Resolve sinal virtual anterior se houver para este ativo específico
        const pendingVirtual = pendingVirtualSignals.current.get(symbol);
        if (pendingVirtual) {
            evaluateVirtualSignal(symbol, price, lastDigit, pendingVirtual);
        }

        setMultiAssetDigits((prev: Record<string, number[]>) => {
            const currentHistory = prev[symbol] || [];
            const newHistory = [lastDigit, ...currentHistory].slice(0, 500);
            if (symbol === asset) {
                setLastDigits(newHistory);
                setLastTickEpoch(tick.epoch);
            }
            return { ...prev, [symbol]: newHistory };
        });

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
    }, [asset, isStudying, setIsStudying, setStudyTicksCount, evaluateVirtualSignal]);

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        consecutiveWins.current = 0;
        lastWinProfit.current = 0.00;
        isManualSession.current = false;
        setVirtualHistory([]);
        pendingVirtualSignals.current.clear();
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
        consecutiveWins.current = 0;
        lastWinProfit.current = 0.00;
        isManualSession.current = false;
        setVirtualHistory([]);
        pendingVirtualSignals.current.clear();
        setTradeStatus('IDLE');
        addLog("Resetado.", "INFO");
    }, [setTotalProfit, setWins, setLosses, setSignals, addLog, setTradeStatus]);

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
                            symbol: data.echo_req.parameters.symbol
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

                        if (isLoss) {
                            setLosses((prev: number) => prev + 1);
                            martingaleLevel.current += 1;
                            consecutiveWins.current = 0;
                            lastWinProfit.current = 0.00;
                            
                            // Se atingiu o limite máximo de gales configurado ou se o Gale deu LOSS
                            if (martingaleLevel.current > 1) { // "sim de red volta mesma coisa" -> Se o Gale der LOSS, volta ao padrão inicial
                                martingaleLevel.current = 0;
                                setVirtualHistory([]); // Reseta o histórico virtual para recomeçar do zero
                                addLog("Gale finalizado em LOSS. Retornando ao padrão inicial de segurança.", "ERROR");
                                setAiThought("Gale deu LOSS. Retornando ao padrão inicial de segurança...");
                            } else {
                                addLog("Entrada real finalizada em LOSS. Preparando Gale para a próxima entrada.", "ERROR");
                                setAiThought("Entrada real deu LOSS. Preparando Gale para a próxima entrada...");
                            }
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            setVirtualHistory([]); // Reseta o histórico virtual após vitória real
                            
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

                        if (totalProfitRef.current >= parseFloat(takeProfit)) {
                            stopBot(`Meta batida!`);
                        } else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) {
                            stopBot(`Stop Loss atingido.`);
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
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, isSorosActive, sorosLevels, addLog]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 4) return null;

        // --- ESTRATÉGIA 3: SEQUÊNCIAS AUTOMÁTICAS PERSONALIZADAS SALVAS ---
        if (autoSequenceActive && symbol === asset && savedCustomStrategies && savedCustomStrategies.length > 0) {
            for (const strat of savedCustomStrategies) {
                if (!strat.isActive) continue;
                
                const triggerArray = strat.trigger.split(',').map(s => s.trim().toUpperCase());
                const len = triggerArray.length;
                
                if (digits.length >= len) {
                    // Pega os últimos 'len' dígitos e inverte para ordem cronológica (mais antigo para o mais recente)
                    const recentDigitsChronological = digits.slice(0, len).reverse();
                    const currentParities = recentDigitsChronological.map(d => d % 2 === 0 ? 'E' : 'O');
                    
                    const match = triggerArray.every((val, idx) => val === currentParities[idx]);

                    if (match) {
                        return {
                            type: strat.entry,
                            contract: strat.entry === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
                            name: strat.name,
                            confidence: 99,
                            symbol
                        };
                    }
                }
            }
        }

        // Se a sequência automática estiver ativa, não executa as outras estratégias para evitar conflito
        if (autoSequenceActive) return null;

        // --- ESTRATÉGIA 2: DÍGITOS (PAR/ÍMPAR) ---
        // Evitar sequências de surf (sequências longas seguidas do mesmo dígito)
        let currentStreak = 1;
        const firstParity = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
            else break;
        }

        // Se houver uma sequência muito longa (surf), não entra para evitar pegar a tendência infinita
        if (currentStreak >= 3) {
            return null; 
        }

        // Padrão Mesclado (Alternado): Ex: Par, Ímpar, Par ou Ímpar, Par, Ímpar nos últimos 4 dígitos
        const p0 = digits[0] % 2 === 0;
        const p1 = digits[1] % 2 === 0;
        const p2 = digits[2] % 2 === 0;
        const p3 = digits[3] % 2 === 0;

        // Detecta alternância perfeita nos últimos 4 dígitos (ex: E, O, E, O)
        const isAlternating = (p0 !== p1) && (p1 !== p2) && (p2 !== p3);

        if (isAlternating) {
            // Se o último foi Par (p0 === true), apostamos que vai continuar alternando e será Ímpar (ODD)
            // Se o último foi Ímpar (p0 === false), apostamos que será Par (EVEN)
            const targetType = p0 ? 'ODD' : 'EVEN';
            return {
                type: targetType,
                contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
                name: 'WAVE (Mesclado)',
                confidence: 92,
                symbol
            };
        }

        return null;
    }, [multiAssetDigits, isStudying, autoSequenceActive, savedCustomStrategies, asset]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string, bypassStudy = false) => {
        if (!isConnected || (!bypassStudy && isStudying) || activeTrades.current.size > 0) return;
        
        // --- VERIFICAÇÃO DE FILTROS VIRTUAIS ---
        const isGaleMode = martingaleLevel.current > 0;
        
        // Verifica se o histórico virtual tem exatamente `virtualTargetLosses` derrotas virtuais seguidas
        const len = virtualHistory.length;
        const isPatternMatched = len >= virtualTargetLosses && 
                                 virtualHistory.slice(-virtualTargetLosses).every(outcome => outcome === 'LOSS');

        // Se o Loss Virtual estiver ativo, não for Gale, não for compra manual, e o padrão não estiver completo: executa como VIRTUAL
        if (isVirtualLossActive && !bypassStudy && !isGaleMode && !isPatternMatched) {
            pendingVirtualSignals.current.set(symbol, {
                signalId, // Salva o ID do sinal para podermos atualizá-lo na interface depois!
                contractType,
                strategyName,
                symbol,
                entryPrice: pricesRef.current[symbol]?.[0] || 0,
                entryDigit: multiAssetDigits[symbol]?.[0] || 0
            });
            return;
        }

        // Executa como operação REAL
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        
        let stakeToUse = baseStake;

        // 1. Se estiver em Martingale (Recuperação de perda)
        if (martingaleLevel.current > 0) {
            stakeToUse = baseStake * Math.pow(mgFactor, martingaleLevel.current);
        } 
        // 2. Se estiver em Soros (Alavancagem de vitória)
        else if (isSorosActive && consecutiveWins.current > 0 && consecutiveWins.current <= sorosLevels) {
            stakeToUse = baseStake + (lastWinProfit.current * (sorosProfitPercentage / 100));
        }

        const params = { 
            amount: parseFloat(stakeToUse.toFixed(2)), 
            basis: 'stake', 
            contract_type: contractType, 
            currency: 'USD', 
            duration: 1, 
            duration_unit: 't', 
            symbol 
        };

        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying, isSorosActive, sorosLevels, sorosProfitPercentage, virtualHistory, multiAssetDigits, isVirtualLossActive, virtualTargetLosses]);

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
                if (activeTrades.current.size === 0) {
                    const isGaleMode = martingaleLevel.current > 0;
                    const len = virtualHistory.length;
                    const isPatternMatched = len >= virtualTargetLosses && 
                                             virtualHistory.slice(-virtualTargetLosses).every(outcome => outcome === 'LOSS');

                    const isReal = !isVirtualLossActive || isGaleMode || isPatternMatched;

                    const sId = addSignal({ 
                        strategy: isReal ? signal.name : `VIRTUAL: ${signal.name}`, 
                        signal: signal.type as any, 
                        details: isReal ? `Sniper Real em ${symbol}` : `Simulação em ${symbol}`, 
                        winRate: `${signal.confidence}%` 
                    });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, lastTickEpoch, virtualHistory, isVirtualLossActive, virtualTargetLosses]);

    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            setIsConnecting(true);
            if (isConnected) { 
                disconnect(); 
                // Pequeno delay seguro para garantir que o socket anterior fechou completamente
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
        manualBuy, isSettingsOpen, setIsSettingsOpen, isConfigModalOpen, setIsConfigModalOpen, virtualHistory
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought, manualBuy, isSettingsOpen, isConfigModalOpen, virtualHistory]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};