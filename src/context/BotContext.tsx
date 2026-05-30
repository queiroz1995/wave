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
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Estados globais para controle de modais por voz
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isGalePausedForFilter = useRef(false);
    const isManualSession = useRef(false); // Controla se a sessão atual foi iniciada manualmente

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});
    
    // Refs para controle do microfone permanente
    const recognitionRef = useRef<any>(null);
    const shouldListenRef = useRef(false);

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
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        isSmartModeActive, setIsSmartModeActive,
        setSignals, accountBalance, wins, losses
    } = stateAndSetters;

    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState({ message: 'Desconectado', color: 'bg-red-500' });
    const [currentConfidence, setCurrentConfidence] = useState(0);

    // Função para encontrar a melhor voz feminina em português (estilo Siri/Alexa)
    const getBestFemalePtVoice = useCallback(() => {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        
        const ptVoices = voices.filter(voice => 
            voice.lang.includes('pt-BR') || 
            voice.lang.includes('pt_BR') || 
            voice.lang.includes('pt-PT')
        );

        if (ptVoices.length === 0) return null;

        const preferredKeywords = ['google', 'siri', 'luciana', 'francisca', 'maria', 'natural', 'online', 'female', 'mulher'];
        
        for (const keyword of preferredKeywords) {
            const found = ptVoices.find(voice => voice.name.toLowerCase().includes(keyword));
            if (found) return found;
        }

        return ptVoices[0];
    }, []);

    // Função para a assistente de voz falar
    const speak = useCallback((text: string) => {
        if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
        
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;  
        utterance.pitch = 1.15; 

        const bestVoice = getBestFemalePtVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isVoiceEnabled, getBestFemalePtVoice]);

    // Garante que as vozes sejam carregadas corretamente em todos os navegadores
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                    getBestFemalePtVoice();
                };
            }
        }
    }, [getBestFemalePtVoice]);

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

    const [virtualTradePending, setVirtualTradePending] = useState<any>(null);

    const processTickData = useCallback((tick: { quote: string, epoch: number, symbol: string }) => {
        const symbol = tick.symbol;
        const lastDigit = parseInt(String(tick.quote).replace(/[^\d.]/g, '').slice(-1));
        if (isNaN(lastDigit)) return;
        
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
            if (virtualTradePending.contract === 'DIGITEVEN') win = lastDigit % 2 === 0;
            else if (virtualTradePending.contract === 'DIGITODD') win = lastDigit % 2 !== 0;

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

    const stopBot = useCallback((reason: string) => {
        setIsBotRunning(false);
        activeTrades.current.clear();
        martingaleLevel.current = 0;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        setAiThought("Bot Parado.");
        addLog(reason, 'INFO');
        speak("Operações finalizadas. " + reason);
    }, [setIsBotRunning, addLog, setTradeStatus, speak]);

    const resetOperations = useCallback(() => {
        totalProfitRef.current = 0;
        setTotalProfit(0);
        setWins(0);
        setLosses(0);
        setSignals([]);
        martingaleLevel.current = 0;
        isGalePausedForFilter.current = false;
        isManualSession.current = false;
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        addLog("Resetado.", "INFO");
        speak("Histórico e lucros reiniciados.");
    }, [setTotalProfit, setWins, setLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus, speak]);

    const toggleBot = useCallback(() => {
        if (!isConnected) {
            speak("Por favor, conecte-se à corretora antes de iniciar o robô.");
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
            speak("Iniciando Wave Sniper. Analisando padrões de mercado.");
        }
    }, [isConnected, isBotRunning, stopBot, resetOperations, speak]);

    const handleWebSocketMessage = useCallback((event: { type: string, payload?: any }) => {
        const data = event.payload;
        if (event.type === 'message') {
            if (data?.msg_type === 'authorize') {
                setIsConnected(true); 
                setIsConnecting(false);
                setStatus({ message: `Sincronizado`, color: 'bg-emerald-500' });
                if (data.authorize?.balance !== undefined) setAccountBalance(parseFloat(data.authorize.balance));
                sendMessageRef.current({ balance: 1, subscribe: 1 });
                speak("Conexão estabelecida com sucesso.");
            } else if (data?.msg_type === 'balance') {
                if (data.balance?.balance !== undefined) setAccountBalance(parseFloat(data.balance.balance));
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
                            
                            // Se atingiu o limite máximo de gales configurado
                            if (martingaleLevel.current > maxLevels) {
                                martingaleLevel.current = 0;
                                isGalePausedForFilter.current = false;
                                if (isManualSession.current) {
                                    isManualSession.current = false;
                                    stopBot("Limite de Martingale atingido na operação manual.");
                                } else {
                                    addLog("Limite de Martingale atingido. Resetando para stake inicial.", "INFO");
                                    speak("Limite de recuperação atingido. Resetando valor de entrada.");
                                }
                            } else {
                                const { isStable } = getMarketState(savedData.symbol);
                                if (!isStable) {
                                    isGalePausedForFilter.current = true;
                                    setVirtualLossStreak(0);
                                    setAiThought("Ciclo instável detectado! Pausando Gale e ativando Filtro Virtual.");
                                    speak("Operação perdida. Ciclo instável detectado, pausando recuperação para sua segurança.");
                                } else {
                                    setAiThought("Mercado estável. Preparando Gale imediato.");
                                    speak("Operação perdida. Aplicando recuperação.");
                                }
                            }
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            isGalePausedForFilter.current = false;
                            setVirtualLossStreak(0);
                            setAiThought("Operação Neutralizada com Sucesso.");
                            speak(`Vitória! Mais ${profitValue.toFixed(2)} dólares.`);

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
                            speak("Excelente! Meta diária batida com sucesso. Parabéns!");
                        } else if (totalProfitRef.current <= -Math.abs(parseFloat(stopLoss))) {
                            stopBot(`Stop Loss atingido.`);
                            speak("Atenção. Limite de perda atingido. Parando operações por segurança.");
                        }
                    }
                }
            }
        } else if (event.type === 'auth_error') {
            setIsConnecting(false);
            setIsConnected(false);
            setStatus({ message: 'Erro de Autenticação', color: 'bg-red-500' });
            speak("Erro de autenticação. Verifique seu token.");
        } else if (event.type === 'error') {
            setIsConnecting(false);
            setStatus({ message: 'Erro de Conexão', color: 'bg-red-500' });
        } else if (event.type === 'close') {
            setIsConnecting(false);
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, getMarketState, speak, maxLevels]);

    const ws = useTradingWebSocketManager({ isConnected, status, setIsConnected, setStatus, setAccountBalance, onMessage: handleWebSocketMessage, reconnectAttemptsRef });
    const { sendMessage, connect, disconnect } = ws;
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const calculateTradeSignal = useCallback((symbol: string) => {
        const digits = multiAssetDigits[symbol] || [];
        if (activeTrades.current.size > 0 || isStudying || digits.length < 5) return null;

        if (isGalePausedForFilter.current && symbol === lastTradedAsset.current) return null;

        const { recommendedDirection } = getMarketState(symbol);
        const direction = isSmartModeActive ? recommendedDirection : entryDirection;

        if (martingaleLevel.current > 0 && lastTradedAsset.current === symbol) {
            const contract = lastContractType.current || 'DIGITEVEN';
            return { type: contract === 'DIGITEVEN' ? 'EVEN' : 'ODD', contract, name: 'Recovery (Gale)', confidence: 99, symbol };
        }

        let currentStreak = 1;
        const firstParity = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstParity) currentStreak++;
            else break;
        }

        if (currentStreak >= consecutiveTarget) {
            const targetType = direction === 'AGAINST' ? (firstParity ? 'ODD' : 'EVEN') : (firstParity ? 'EVEN' : 'ODD');
            return { 
                type: targetType, 
                contract: targetType === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD', 
                name: 'WAVE', 
                confidence: 85 + (currentStreak * 2), 
                symbol 
            };
        }
        return null;
    }, [multiAssetDigits, consecutiveTarget, entryDirection, isStudying, isSmartModeActive, getMarketState]);

    const executeBuy = useCallback((contractType: ContractType, strategyName: string, signalId: string, symbol: string) => {
        if (!isConnected || isStudying || activeTrades.current.size > 0) return;
        const baseStake = parseFloat(initialStake) || 0.35;
        const mgFactor = parseFloat(martingaleFactor) || 2.1; 
        const stakeToUse = martingaleLevel.current > 0 ? baseStake * Math.pow(mgFactor, martingaleLevel.current) : baseStake;
        
        const params = { amount: parseFloat(stakeToUse.toFixed(2)), basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol };
        lastContractType.current = contractType;
        lastTradedAsset.current = symbol;
        activeTrades.current.add(signalId);
        setTradeStatus('SENDING');
        sendMessage({ buy: 1, price: parseFloat(stakeToUse.toFixed(2)), parameters: params, passthrough: { signalId, strategyName } });
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying]);

    // Função para compra manual (usada por voz ou botões)
    const manualBuy = useCallback((contractType: ContractType, source: string = 'Manual') => {
        if (!isConnected) {
            toast.error("Conecte-se primeiro.");
            speak("Por favor, conecte-se à corretora antes de operar.");
            return;
        }
        
        // Ativa a sessão manual inteligente
        isManualSession.current = true;
        if (!isBotRunning) {
            setIsBotRunning(true);
            setIsStudying(false); // Ignora o estudo inicial para entrada manual imediata
            setAiThought("Entrada manual detectada. Monitorando recuperação inteligente...");
        }

        const sId = addSignal({ 
            strategy: source, 
            signal: contractType === 'DIGITEVEN' ? 'EVEN' : 'ODD', 
            details: `Entrada manual via ${source}`, 
            winRate: '100%' 
        });
        executeBuy(contractType, source, sId, asset);
    }, [isConnected, isBotRunning, setIsBotRunning, setIsStudying, setAiThought, addSignal, executeBuy, asset, speak]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS.map(a => a.value)) {
            const signal = calculateTradeSignal(symbol);
            if (signal) {
                const { recommendedVirtualLosses } = getMarketState(symbol);
                const target = isSmartModeActive ? recommendedVirtualLosses : virtualTargetLosses;
                
                const isRecovery = signal.name.includes('Recovery');
                const needsVirtual = target > 0 && virtualLossStreak < target;
                
                if (needsVirtual) {
                    if (!virtualTradePending) {
                        const sId = addSignal({ 
                            strategy: isRecovery ? `VIRTUAL (RECOVERY FILTER)` : `VIRTUAL (IA: ${target}L)`, 
                            signal: signal.type as any, 
                            details: isRecovery ? `Limpando ciclo para Gale seguro` : `Filtro dinâmico em ${symbol}`, 
                            winRate: `${signal.confidence}%` 
                        });
                        setVirtualTradePending({ ...signal, signalId: sId, symbol });
                    }
                    break;
                }
                
                if (activeTrades.current.size === 0) {
                    const sId = addSignal({ strategy: signal.name, signal: signal.type as any, details: `Sniper Real em ${symbol}`, winRate: `${signal.confidence}%` });
                    executeBuy(signal.contract as ContractType, signal.name, sId, symbol);
                    break;
                }
            }
        }
    }, [isBotRunning, calculateTradeSignal, addSignal, executeBuy, isStudying, virtualTradePending, virtualLossStreak, virtualTargetLosses, isSmartModeActive, getMarketState]);

    // Função auxiliar para converter números falados em português para dígitos numéricos
    const parseSpokenNumber = (text: string): string | null => {
        const clean = text.toLowerCase().trim();
        
        // Dicionário de números falados comuns
        const numberMap: Record<string, string> = {
            'zero': '0', 'um': '1', 'dois': '2', 'tres': '3', 'três': '3',
            'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7', 'oito': '8',
            'nove': '9', 'dez': '10', 'vinte': '20', 'trinta': '30', 'quarenta': '40',
            'cinquenta': '50', 'cem': '100', 'meio': '0.5', 'metade': '0.5'
        };

        // Substitui palavras por números
        let parsed = clean;
        Object.entries(numberMap).forEach(([word, num]) => {
            parsed = parsed.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
        });

        // Trata "ponto" ou "vírgula" como separador decimal
        parsed = parsed.replace(/\s*(ponto|vírgula|virgula)\s*/g, '.');
        
        // Remove espaços entre números (ex: "0 . 35" -> "0.35")
        parsed = parsed.replace(/\s+/g, '');

        // Extrai o primeiro número válido encontrado (inteiro ou decimal)
        const match = parsed.match(/\d+(\.\d+)?/);
        return match ? match[0] : null;
    };

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

    // Processador de comandos de voz interativos (Atende a TODOS os comandos do bot)
    const processVoiceCommand = useCallback((command: string) => {
        const cleanCommand = command.toLowerCase().trim();
        
        // Dicionários de sinônimos fonéticos para tolerância a erros de fala
        const startKeywords = ['iniciar', 'começar', 'começa', 'ligar', 'liga', 'start', 'decolar', 'decola', 'play', 'rodar', 'roda', 'ativar', 'ativa', 'ligue', 'inicie', 'comece'];
        const stopKeywords = ['parar', 'pausar', 'desligar', 'stop', 'brecar', 'pausa', 'desliga', 'para o bot', 'para bot', 'para tudo', 'breca', 'para aí', 'parou', 'pausou'];
        const balanceKeywords = ['saldo', 'banca', 'balanço', 'dinheiro', 'quanto tenho', 'meu saldo', 'minha banca', 'salto', 'balanço'];
        const profitKeywords = ['lucro', 'resultado', 'ganho', 'ganhos', 'quanto ganhei', 'lucros', 'luco', 'ganhei'];
        const resetKeywords = ['limpar', 'reiniciar', 'reseta', 'resetar', 'limpa', 'reinicia', 'apagar', 'apaga', 'zerar', 'zera'];
        const stakeKeywords = ['stake', 'entrada', 'aposta', 'valor'];
        const metaKeywords = ['meta', 'take profit', 'objetivo', 'alvo', 'se ganhar para', 'parar se ganhar'];
        const stopLossKeywords = ['stop loss', 'stop', 'perda máxima', 'perda limite', 'limite de perda', 'se perder para', 'parar se perder'];
        const durationKeywords = ['tick', 'duração', 'tempo', 'segundos'];
        const realKeywords = ['real', 'conta real', 'dinheiro real', 'reais'];
        const demoKeywords = ['demo', 'treinamento', 'virtual', 'demonstração', 'fake', 'treino'];
        const voiceOffKeywords = ['desativar voz', 'mutar voz', 'silenciar', 'desliga voz', 'muta voz'];
        const voiceOnKeywords = ['ativar voz', 'falar', 'liga voz', 'ativa voz'];
        const assetKeywords = ['volatilidade', 'mercado', 'ativo'];
        const parPhonetics = ['par', 'para', 'pares', 'even', 'pau', 'pal', 'pari', 'pago', 'pato', 'pai', 'paz'];
        const imparPhonetics = ['ímpar', 'impar', 'limpar', 'limpa', 'ímpa', 'impa', 'odd', 'ipa', 'hipa', 'hípica', 'infra', 'intima'];
        const isBuyAction = cleanCommand.includes('comprar') || cleanCommand.includes('entrar') || cleanCommand.includes('apostar') || cleanCommand.includes('compra') || cleanCommand.includes('entra');

        // Divide a frase em múltiplos sub-comandos usando conectores comuns
        const subCommands = cleanCommand
            .split(/\b(?:e|depois|em seguida|também|tambem|mais|e depois)\b|[,;]/)
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        const feedbacks: string[] = [];
        let processedAny = false;

        for (const subCmd of subCommands) {
            let processed = false;

            // --- NOVOS COMANDOS DE GESTÃO DE PERDAS E CONFIGURAÇÕES AVANÇADAS ---

            // 1. Fator Martingale (Ex: "fator martingale de 2.2", "multiplicador de 2.5")
            if (!processed && (subCmd.includes('fator martingale') || subCmd.includes('multiplicador martingale') || subCmd.includes('multiplicador de gale') || subCmd.includes('fator de gale') || subCmd.includes('multiplicador de'))) {
                const val = parseSpokenNumber(subCmd);
                if (val) {
                    setMartingaleFactor(val);
                    feedbacks.push(`fator martingale configurado para ${val}`);
                    toast.success(`Martingale: ${val}x`);
                    processed = true;
                }
            }

            // 2. Níveis Máximos de Martingale (Ex: "níveis de martingale de 5", "gale máximo de 3")
            if (!processed && (subCmd.includes('níveis de martingale') || subCmd.includes('niveis de martingale') || subCmd.includes('gale máximo') || subCmd.includes('gale maximo') || subCmd.includes('limite de gale') || subCmd.includes('gales de'))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    setMaxLevels(val);
                    feedbacks.push(`limite de martingale definido para ${val} níveis`);
                    toast.success(`Gale Máximo: ${val} níveis`);
                    processed = true;
                }
            }

            // 3. Ativar/Desativar Martingale (Ex: "desativar martingale", "sem gale", "ativar martingale")
            if (!processed && (subCmd.includes('desativar martingale') || subCmd.includes('desativa martingale') || subCmd.includes('sem gale') || subCmd.includes('desliga gale') || subCmd.includes('desativar gale'))) {
                setIsMartingaleActive(false);
                feedbacks.push("martingale desativado");
                toast.info("Martingale Desativado");
                processed = true;
            }
            if (!processed && (subCmd.includes('ativar martingale') || subCmd.includes('ativa martingale') || subCmd.includes('com gale') || subCmd.includes('liga gale') || subCmd.includes('ativar gale'))) {
                setIsMartingaleActive(true);
                feedbacks.push("martingale ativado");
                toast.info("Martingale Ativado");
                processed = true;
            }

            // 4. Ativar/Desativar Soros (Ex: "ativar soros", "com soros", "desativar soros")
            if (!processed && (subCmd.includes('ativar soros') || subCmd.includes('ativa soros') || subCmd.includes('com soros') || subCmd.includes('liga soros'))) {
                setIsSorosActive(true);
                feedbacks.push("gerenciamento soros ativado");
                toast.info("Soros Ativado");
                processed = true;
            }
            if (!processed && (subCmd.includes('desativar soros') || subCmd.includes('desativa soros') || subCmd.includes('sem soros') || subCmd.includes('desliga soros'))) {
                setIsSorosActive(false);
                feedbacks.push("gerenciamento soros desativado");
                toast.info("Soros Desativado");
                processed = true;
            }

            // 5. Níveis de Soros (Ex: "níveis de soros de 3", "soros de 2 níveis")
            if (!processed && (subCmd.includes('níveis de soros') || subCmd.includes('niveis de soros') || subCmd.includes('nível de soros') || subCmd.includes('nivel de soros'))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    setSorosLevels(val);
                    feedbacks.push(`níveis de soros configurados para ${val}`);
                    toast.success(`Níveis Soros: ${val}`);
                    processed = true;
                }
            }

            // 6. Porcentagem de Reinvestimento Soros (Ex: "reinvestir 80 por cento", "porcentagem de soros de 50")
            if (!processed && (subCmd.includes('porcentagem de soros') || subCmd.includes('reinvestir') || subCmd.includes('por cento do lucro'))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    setSorosProfitPercentage(val);
                    feedbacks.push(`reinvestimento de soros definido para ${val} por cento`);
                    toast.success(`Soros: Reinvestir ${val}%`);
                    processed = true;
                }
            }

            // 7. Quanto falta para a meta (Ex: "quanto falta para a meta", "distância da meta")
            if (!processed && (subCmd.includes('quanto falta para a meta') || subCmd.includes('quanto falta pra meta') || subCmd.includes('distância da meta') || subCmd.includes('distancia da meta'))) {
                const target = parseFloat(takeProfit) || 0;
                const current = totalProfitRef.current;
                if (target > 0) {
                    const diff = target - current;
                    if (diff <= 0) {
                        feedbacks.push("sua meta já foi batida nesta sessão");
                    } else {
                        feedbacks.push(`faltam exatamente ${diff.toFixed(2)} dólares para atingir sua meta`);
                    }
                } else {
                    feedbacks.push("nenhuma meta de lucro foi configurada ainda");
                }
                processed = true;
            }

            // 8. Histórico de hoje / Relatório (Ex: "como estão as operações", "histórico de hoje", "relatório")
            if (!processed && (subCmd.includes('como estão as operações') || subCmd.includes('como estao as operacoes') || subCmd.includes('histórico de hoje') || subCmd.includes('historico de hoje') || subCmd.includes('relatório') || subCmd.includes('relatorio'))) {
                const total = wins + losses;
                const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0";
                feedbacks.push(`atualmente temos ${wins} vitórias e ${losses} derrotas, com uma assertividade de ${winRate} por cento`);
                processed = true;
            }

            // 9. Como está o mercado / Análise (Ex: "como está o mercado", "análise do mercado", "analise do mercado")
            if (!processed && (subCmd.includes('como está o mercado') || subCmd.includes('como estao os graficos') || subCmd.includes('análise do mercado') || subCmd.includes('analise do mercado'))) {
                const state = getMarketState(asset);
                const stabilityText = state.isStable ? "estável e seguro" : "instável com alta oscilação";
                feedbacks.push(`o mercado atual está ${stabilityText}, com taxa de confiança de ${state.confidence} por cento. Recomendo filtro de ${state.recommendedVirtualLosses} perdas virtuais`);
                processed = true;
            }

            // 10. Ajuda Completa / Comandos (Ex: "ajuda completa", "quais são os comandos", "comandos de voz")
            if (!processed && (subCmd.includes('ajuda completa') || subCmd.includes('quais são os comandos') || subCmd.includes('quais sao os comandos') || subCmd.includes('comandos de voz') || subCmd.includes('lista de comandos'))) {
                feedbacks.push("você pode configurar entrada, meta, stop loss, fator martingale, níveis de gale, ativar ou desativar soros, abrir planilha, abrir protocolo de risco, mudar de conta e comprar par ou ímpar");
                processed = true;
            }

            // 11. Máxima sequência de Par ou Ímpar nas últimas 100 rodadas
            if (!processed && (subCmd.includes('máximo de par ou ímpar') || subCmd.includes('maximo de par ou impar') || subCmd.includes('máxima sequência') || subCmd.includes('maxima sequencia') || subCmd.includes('sequência seguida') || subCmd.includes('sequencia seguida') || subCmd.includes('par ou ímpar seguido') || subCmd.includes('par ou impar seguido'))) {
                const subset = lastDigits.slice(0, 100);
                if (subset.length === 0) {
                    feedbacks.push("ainda não tenho dados suficientes para calcular as sequências");
                } else {
                    let maxEven = 0;
                    let maxOdd = 0;
                    let currentEven = 0;
                    let currentOdd = 0;
                    
                    for (let i = subset.length - 1; i >= 0; i--) {
                        const isEven = subset[i] % 2 === 0;
                        if (isEven) {
                            currentEven++;
                            currentOdd = 0;
                            if (currentEven > maxEven) maxEven = currentEven;
                        } else {
                            currentOdd++;
                            currentEven = 0;
                            if (currentOdd > maxOdd) maxOdd = currentOdd;
                        }
                    }
                    feedbacks.push(`nas últimas cem rodadas, a maior sequência consecutiva de números pares foi de ${maxEven} vezes, e de números ímpares foi de ${maxOdd} vezes`);
                    toast.success(`Max Par: ${maxEven}x | Max Ímpar: ${maxOdd}x`);
                }
                processed = true;
            }

            // --- FIM DOS NOVOS COMANDOS ---

            // Dobrar Aposta
            if (!processed && (subCmd.includes('dobra aposta') || subCmd.includes('dobrar aposta') || subCmd.includes('dobra a entrada') || subCmd.includes('dobrar a entrada') || subCmd.includes('dobra'))) {
                const current = parseFloat(initialStake) || 0.35;
                const doubled = (current * 2).toFixed(2);
                setInitialStake(doubled);
                feedbacks.push(`aposta dobrada para ${doubled} dólares`);
                toast.success(`Aposta Dobrada: $${doubled}`);
                processed = true;
            }

            // Mostrar Números Saindo
            if (!processed && (subCmd.includes('números tá saindo') || subCmd.includes('numeros ta saindo') || subCmd.includes('quais números') || subCmd.includes('quais numeros') || subCmd.includes('números saindo') || subCmd.includes('numeros saindo') || subCmd.includes('últimos números') || subCmd.includes('ultimos numeros'))) {
                const last5 = lastDigits.slice(0, 5).reverse().join(', ');
                if (last5) {
                    feedbacks.push(`os últimos números que saíram são: ${last5}`);
                } else {
                    feedbacks.push("ainda não recebi dados de dígitos");
                }
                processed = true;
            }

            // Qual Ativo
            if (!processed && (subCmd.includes('qual ativo') || subCmd.includes('qual mercado') || subCmd.includes('ativo atual') || subCmd.includes('mercado atual'))) {
                const currentAssetObj = SCANNER_ASSETS.find(a => a.value === asset);
                const assetLabel = currentAssetObj ? currentAssetObj.label : asset;
                feedbacks.push(`o ativo atual em operação é o ${assetLabel}`);
                processed = true;
            }

            // Abrir Planilha
            if (!processed && (subCmd.includes('abre planilha') || subCmd.includes('abrir planilha') || subCmd.includes('mostra planilha') || subCmd.includes('mostrar planilha'))) {
                setIsSettingsOpen(true);
                feedbacks.push("planilha de gestão aberta");
                toast.info("Planilha de Gestão Aberta");
                processed = true;
            }
            if (!processed && (subCmd.includes('fecha planilha') || subCmd.includes('fechar planilha') || subCmd.includes('esconde planilha') || subCmd.includes('esconder planilha'))) {
                setIsSettingsOpen(false);
                feedbacks.push("planilha de gestão fechada");
                processed = true;
            }

            // Abrir Protocolo de Risco
            if (!processed && (subCmd.includes('abre protocolo') || subCmd.includes('abrir protocolo') || subCmd.includes('protocolo de risco') || subCmd.includes('protocolo de risco aberto') || subCmd.includes('abre risco') || subCmd.includes('abrir risco'))) {
                setIsConfigModalOpen(true);
                feedbacks.push("protocolo de risco aberto");
                toast.info("Protocolo de Risco Aberto");
                processed = true;
            }
            if (!processed && (subCmd.includes('fecha protocolo') || subCmd.includes('fechar protocolo') || subCmd.includes('fecha risco') || subCmd.includes('fechar risco'))) {
                setIsConfigModalOpen(false);
                feedbacks.push("protocolo de risco fechado");
                processed = true;
            }

            // Configurar Repetições
            const isRepetitionRule = subCmd.includes('repetir') || subCmd.includes('repetição') || subCmd.includes('repeticoes') || subCmd.includes('sequência') || subCmd.includes('sequencia');
            if (!processed && isRepetitionRule) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    setConsecutiveTarget(val);
                    setIsSmartModeActive(false);

                    let directionText = "contra a tendência";
                    if (subCmd.includes('a favor') || subCmd.includes('seguir') || subCmd.includes('continuar')) {
                        setEntryDirection('FAVOR');
                        directionText = "a favor da tendência";
                    } else {
                        setEntryDirection('AGAINST');
                    }

                    feedbacks.push(`repetições configuradas para ${val} ${directionText}`);
                    toast.success(`Regra: ${val} repetições (${directionText})`);
                    processed = true;
                }
            }

            // Configurar Direção da Entrada
            if (!processed && (subCmd.includes('a favor') || subCmd.includes('seguir a tendência') || subCmd.includes('continuar a sequência'))) {
                setEntryDirection('FAVOR');
                setIsSmartModeActive(false);
                feedbacks.push("entradas configuradas a favor da tendência");
                toast.success("Regra: A Favor");
                processed = true;
            }
            if (!processed && (subCmd.includes('contra') || subCmd.includes('reversão') || subCmd.includes('quebrar a sequência') || subCmd.includes('quebrar a repetição'))) {
                setEntryDirection('AGAINST');
                setIsSmartModeActive(false);
                feedbacks.push("entradas configuradas contra a tendência");
                toast.success("Regra: Contra");
                processed = true;
            }

            // Configurar Filtro Virtual
            if (!processed && (subCmd.includes('filtro virtual') || subCmd.includes('perda virtual') || subCmd.includes('perdas virtuais') || subCmd.includes('loss virtual'))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    setVirtualTargetLosses(val);
                    setIsSmartModeActive(false);
                    feedbacks.push(`filtro virtual definido para ${val} perdas`);
                    toast.success(`Filtro Virtual: ${val} Losses`);
                    processed = true;
                }
            }

            // Reativar Modo Inteligente
            if (!processed && (subCmd.includes('modo inteligente') || subCmd.includes('ia decidir') || subCmd.includes('modo automático') || subCmd.includes('modo automatico'))) {
                setIsSmartModeActive(true);
                feedbacks.push("modo inteligente ativado");
                toast.success("Modo Inteligente Ativado");
                processed = true;
            }

            // Iniciar / Parar / Pausar
            if (!processed && startKeywords.some(kw => subCmd.includes(kw))) {
                if (!isConnected) {
                    feedbacks.push("não posso iniciar porque você não está conectado");
                    toast.error("Conecte-se primeiro.");
                } else if (!isBotRunning) {
                    toggleBot();
                    feedbacks.push("iniciando operações");
                } else {
                    feedbacks.push("o robô já está rodando");
                }
                processed = true;
            }
            if (!processed && stopKeywords.some(kw => subCmd.includes(kw))) {
                const hasNumber = parseSpokenNumber(subCmd) !== null;
                const isStopLoss = subCmd.includes('loss') || subCmd.includes('limite') || subCmd.includes('máxima') || subCmd.includes('maxima') || subCmd.includes('perda');
                
                // Evita confundir "stop" de parar o bot com "stop loss" ou "stop de X dólares"
                if (!(subCmd.includes('stop') && (hasNumber || isStopLoss))) {
                    if (isBotRunning) {
                        toggleBot();
                        feedbacks.push("operações pausadas");
                    } else {
                        feedbacks.push("o robô já está parado");
                    }
                    processed = true;
                }
            }

            // Consultas de Saldo e Lucro
            if (!processed && balanceKeywords.some(kw => subCmd.includes(kw))) {
                if (accountBalance !== null) {
                    feedbacks.push(`seu saldo é de ${accountBalance.toFixed(2)} dólares`);
                } else {
                    feedbacks.push("não consegui ler o saldo");
                }
                processed = true;
            }
            if (!processed && profitKeywords.some(kw => subCmd.includes(kw))) {
                feedbacks.push(`seu lucro atual é de ${totalProfitRef.current.toFixed(2)} dólares`);
                processed = true;
            }

            // Limpar / Reiniciar
            if (!processed && resetKeywords.some(kw => subCmd.includes(kw))) {
                resetOperations();
                feedbacks.push("histórico e lucros reiniciados");
                processed = true;
            }

            // Mudar Entrada / Stake
            if (!processed && stakeKeywords.some(kw => subCmd.includes(kw))) {
                const val = parseSpokenNumber(subCmd);
                if (val) {
                    setInitialStake(val);
                    feedbacks.push(`entrada alterada para ${val} dólares`);
                    toast.success(`Entrada: $${val}`);
                    processed = true;
                }
            }

            // Mudar Meta / Take Profit
            if (!processed && metaKeywords.some(kw => subCmd.includes(kw))) {
                const val = parseSpokenNumber(subCmd);
                if (val) {
                    setTakeProfit(val);
                    feedbacks.push(`meta definida em ${val} dólares`);
                    toast.success(`Meta: $${val}`);
                    processed = true;
                }
            }

            // Mudar Stop Loss
            if (!processed && stopLossKeywords.some(kw => subCmd.includes(kw))) {
                const val = parseSpokenNumber(subCmd);
                if (val) {
                    setStopLoss(val);
                    feedbacks.push(`stop loss definido em ${val} dólares`);
                    toast.success(`Stop Loss: $${val}`);
                    processed = true;
                }
            }

            // Mudar Ticks / Duração
            if (!processed && durationKeywords.some(kw => subCmd.includes(kw))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const val = parseInt(valStr);
                    if (val >= 1 && val <= 10) {
                        setDuration(val);
                        feedbacks.push(`duração alterada para ${val} ticks`);
                        toast.success(`Duração: ${val} Ticks`);
                        processed = true;
                    }
                }
            }

            // Mudar Tipo de Conta
            if (!processed && realKeywords.some(kw => subCmd.includes(kw))) {
                setAccountType('real');
                feedbacks.push("conta alterada para real");
                toast.info("Conta: REAL");
                if (realToken) {
                    handleConnect('real', realToken);
                } else {
                    feedbacks.push("por favor, configure o token da conta real");
                }
                processed = true;
            }
            if (!processed && demoKeywords.some(kw => subCmd.includes(kw))) {
                setAccountType('demo');
                feedbacks.push("conta alterada para demo");
                toast.info("Conta: DEMO");
                if (demoToken) {
                    handleConnect('demo', demoToken);
                } else {
                    feedbacks.push("por favor, configure o token da conta demo");
                }
                processed = true;
            }

            // Compras Manuais por Voz (Com suporte a Gale 3 automático)
            if (!processed && isBuyAction) {
                const hasPar = parPhonetics.some(p => subCmd.includes(p));
                const hasImpar = imparPhonetics.some(i => subCmd.includes(i));
                
                // Verifica se o usuário pediu Gale até 3 tentativas
                const hasGale3 = subCmd.includes('gale até 3') || subCmd.includes('gale ate 3') || subCmd.includes('gale de 3') || subCmd.includes('3 tentativas') || subCmd.includes('três tentativas') || subCmd.includes('tres tentativas') || subCmd.includes('gale até três') || subCmd.includes('gale ate tres');

                if (hasPar && !hasImpar) {
                    if (hasGale3) {
                        setMaxLevels(3);
                        setIsMartingaleActive(true);
                        setIsBotRunning(true);
                        resetOperations();
                        setIsStudying(false); // Entra imediatamente sem esperar estudo
                        
                        setTimeout(() => {
                            manualBuy('DIGITEVEN', 'Voz (Gale 3)');
                        }, 100);
                        
                        feedbacks.push("configurando gale até 3 tentativas e entrando em par com o robô ativo");
                    } else {
                        manualBuy('DIGITEVEN', 'Voz');
                        feedbacks.push("comprando par");
                    }
                    processed = true;
                } else if (hasImpar) {
                    if (hasGale3) {
                        setMaxLevels(3);
                        setIsMartingaleActive(true);
                        setIsBotRunning(true);
                        resetOperations();
                        setIsStudying(false); // Entra imediatamente sem esperar estudo
                        
                        setTimeout(() => {
                            manualBuy('DIGITODD', 'Voz (Gale 3)');
                        }, 100);
                        
                        feedbacks.push("configurando gale até 3 tentativas e entrando em ímpar com o robô ativo");
                    } else {
                        manualBuy('DIGITODD', 'Voz');
                        feedbacks.push("comprando ímpar");
                    }
                    processed = true;
                }
            }

            // Ativar / Desativar Voz
            if (!processed && voiceOffKeywords.some(kw => subCmd.includes(kw))) {
                setIsVoiceEnabled(false);
                toast.info("Voz desativada.");
                processed = true;
            }
            if (!processed && voiceOnKeywords.some(kw => subCmd.includes(kw))) {
                setIsVoiceEnabled(true);
                feedbacks.push("voz ativada");
                toast.info("Voz ativada.");
                processed = true;
            }

            // Mudar Ativo / Mercado
            if (!processed && assetKeywords.some(kw => subCmd.includes(kw))) {
                const valStr = parseSpokenNumber(subCmd);
                if (valStr) {
                    const num = valStr;
                    const assetMap: Record<string, string> = {
                        '10': '1HZ10V',
                        '25': '1HZ25V',
                        '50': '1HZ50V',
                        '75': '1HZ75V',
                        '100': '1HZ100V'
                    };
                    const targetAsset = assetMap[num];
                    if (targetAsset) {
                        setAsset(targetAsset);
                        feedbacks.push(`mercado alterado para volatilidade ${num}`);
                        toast.success(`Market: Volatility ${num}`);
                        processed = true;
                    }
                }
            }

            if (processed) {
                processedAny = true;
            }
        }

        if (processedAny) {
            // Combina todos os feedbacks em uma única frase natural
            const finalSpeech = feedbacks.join(", e ").trim();
            if (finalSpeech) {
                speak("Entendido! " + finalSpeech + ".");
            }
        }
    }, [isConnected, isBotRunning, toggleBot, accountBalance, resetOperations, speak, setInitialStake, setTakeProfit, setStopLoss, setDuration, setAccountType, manualBuy, setIsVoiceEnabled, setAsset, setConsecutiveTarget, setEntryDirection, setVirtualTargetLosses, setIsSmartModeActive, initialStake, lastDigits, asset, setMartingaleFactor, setMaxLevels, setIsMartingaleActive, setIsSorosActive, setSorosLevels, setSorosProfitPercentage, wins, losses, getMarketState, handleConnect, realToken, demoToken]);

    // Referência dinâmica para o processador de voz sempre ter o estado mais recente
    const processVoiceCommandRef = useRef(processVoiceCommand);
    useEffect(() => {
        processVoiceCommandRef.current = processVoiceCommand;
    }, [processVoiceCommand]);

    // Função para iniciar o reconhecimento de voz permanente
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou Safari.");
            addLog("Reconhecimento de voz não suportado neste navegador.", "ERROR");
            return;
        }
        
        // Se já estiver ativo, desliga o microfone permanente
        if (shouldListenRef.current) {
            shouldListenRef.current = false;
            setIsListening(false);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            toast.info("Microfone desativado.");
            speak("Microfone desativado.");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true; // Escuta contínua
        recognition.interimResults = false;
        recognition.maxAlternatives = 3; // Analisa até 3 alternativas para máxima precisão!

        recognitionRef.current = recognition;
        shouldListenRef.current = true;

        recognition.onstart = () => {
            setIsListening(true);
            setAiThought("Microfone ativo permanente...");
            toast.info("Microfone ativo permanente. Fale quando quiser!", { id: "mic-status" });
            speak("Microfone ativado em modo permanente. Estou ouvindo.");
        };

        recognition.onresult = (event: any) => {
            const resultIndex = event.resultIndex;
            const results = event.results[resultIndex];
            
            // Tenta encontrar o melhor comando analisando as alternativas de transcrição
            let bestText = results[0].transcript;
            
            // Se tiver alternativas, procura se alguma delas bate com palavras-chave importantes
            if (results.length > 1) {
                const keywords = ['par', 'para', 'ímpar', 'impar', 'limpar', 'iniciar', 'parar', 'saldo', 'lucro', 'stake', 'entrada', 'meta', 'stop', 'repetir', 'repetição', 'sequência', 'contra', 'favor', 'filtro', 'dobra', 'planilha', 'protocolo', 'real', 'demo', 'gale', 'martingale', 'soros'];
                for (let i = 0; i < results.length; i++) {
                    const altText = results[i].transcript.toLowerCase();
                    const hasKeyword = keywords.some(kw => altText.includes(kw));
                    if (hasKeyword) {
                        bestText = results[i].transcript;
                        break;
                    }
                }
            }

            setAiThought(`Você disse: "${bestText}"`);
            toast.success(`Comando reconhecido: "${bestText}"`, { id: "mic-status" });
            processVoiceCommandRef.current(bestText);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event);
            if (event.error === 'not-allowed') {
                shouldListenRef.current = false;
                setIsListening(false);
                toast.error("Permissão de microfone negada. Ative o microfone nas configurações do seu navegador.", { id: "mic-status" });
            }
        };

        recognition.onend = () => {
            // Se o usuário não desligou manualmente, reinicia o microfone automaticamente
            if (shouldListenRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Erro ao reiniciar microfone permanente", e);
                }
            } else {
                setIsListening(false);
            }
        };

        recognition.start();
    }, [addLog, speak]);

    const selectAI = useCallback((ia: any) => { 
        setSelectedAIInfo(ia); 
        setActiveStrategy(ia.id); 
        setAppFlow('operating'); 
        speak(`Núcleo ${ia.name} ativado. Pronto para decolar.`);
    }, [setActiveStrategy, speak]);

    const exitToSelection = useCallback(() => { 
        stopBot("Sessão Finalizada"); 
        setAppFlow('selection'); 
    }, [stopBot]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought,
        isVoiceEnabled, setIsVoiceEnabled, isSpeaking, speak, isListening, startListening, manualBuy,
        isSettingsOpen, setIsSettingsOpen, isConfigModalOpen, setIsConfigModalOpen
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought, isVoiceEnabled, isSpeaking, speak, isListening, startListening, manualBuy, isSettingsOpen, isConfigModalOpen]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};