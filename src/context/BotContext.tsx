"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useBotState } from '../hooks/bot/useBotState';
import { useBotPersistence } from '../hooks/bot/useBotPersistence';
import { useTradingWebSocketManager } from '../hooks/bot/useTradingWebSocketManager';
import { ContractType } from '@/types/bot';

const BotContext = createContext<any>(undefined);

const SCANNER_ASSETS = [
    '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
    'R_10', 'R_25', 'R_50', 'R_75', 'R_100'
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

    const activeTrades = useRef<Set<string>>(new Set());
    const totalProfitRef = useRef(0.00);
    const martingaleLevel = useRef(0);
    const lastContractType = useRef<ContractType | null>(null);
    const lastTradedAsset = useRef<string | null>(null);
    
    const isGalePausedForFilter = useRef(false);

    const pendingContracts = useRef<Map<string, any>>(new Map());
    const reconnectAttemptsRef = useRef(0);
    const sendMessageRef = useRef<(payload: any) => void>(() => {});

    const {
        addLog, setAccountBalance, setLastDigits, setIsBotRunning,
        setTotalProfit, setWins, setLosses,
        asset, initialStake, addSignal, updateSignalResult,
        lastDigits, setLastTickEpoch, lastTickEpoch,
        multiAssetDigits, setMultiAssetDigits,
        setTradeStatus, isBotRunning, setActiveStrategy,
        accountType, realToken, demoToken,
        takeProfit, stopLoss, martingaleFactor,
        setNeuralPredictions,
        isStudying, setIsStudying, setStudyTicksCount,
        virtualLossStreak, setVirtualLossStreak,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, entryDirection,
        isSmartModeActive, setIsSmartModeActive,
        setSignals, accountBalance
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
            SCANNER_ASSETS.forEach(symbol => {
                sendMessageRef.current({ ticks: symbol, subscribe: 1 });
                fetchDerivHistory(symbol);
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
        setVirtualLossStreak(0);
        setVirtualTradePending(null);
        setTradeStatus('IDLE');
        addLog("Resetado.", "INFO");
        speak("Histórico e lucros reiniciados.");
    }, [setTotalProfit, setWins, setLosses, setSignals, setVirtualLossStreak, addLog, setTradeStatus, speak]);

    const toggleBot = useCallback(() => {
        if (!isConnected) return;
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
                setStatus({ message: `Sincronizado`, color: 'bg-green-500' });
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
                        } else {
                            setWins((prev: number) => prev + 1);
                            martingaleLevel.current = 0;
                            isGalePausedForFilter.current = false;
                            setVirtualLossStreak(0);
                            setAiThought("Operação Neutralizada com Sucesso.");
                            speak(`Vitória! Mais ${profitValue.toFixed(2)} dólares.`);
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
        }
    }, [processTickData, setAccountBalance, setTotalProfit, setWins, setLosses, updateSignalResult, takeProfit, stopLoss, stopBot, getMarketState, speak]);

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
        
        // REMOVIDO: speak(...) automático de entrada para evitar spam de áudio
    }, [isConnected, initialStake, sendMessage, setTradeStatus, martingaleFactor, isStudying]);

    useEffect(() => {
        if (!isBotRunning || isStudying) return;
        
        for (const symbol of SCANNER_ASSETS) {
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

    // Processador de comandos de voz interativos
    const processVoiceCommand = useCallback((command: string) => {
        const cleanCommand = command.toLowerCase().trim();
        
        if (cleanCommand.includes('iniciar') || cleanCommand.includes('começar') || cleanCommand.includes('ligar')) {
            if (!isBotRunning) {
                toggleBot();
                speak("Iniciando as operações agora.");
            } else {
                speak("O sniper já está em execução.");
            }
        } else if (cleanCommand.includes('parar') || cleanCommand.includes('pausar') || cleanCommand.includes('desligar')) {
            if (isBotRunning) {
                toggleBot();
                speak("Operações pausadas com sucesso.");
            } else {
                speak("O sniper já está parado.");
            }
        } else if (cleanCommand.includes('saldo') || cleanCommand.includes('banca')) {
            if (accountBalance !== null) {
                speak(`Seu saldo atual é de ${accountBalance.toFixed(2)} dólares.`);
            } else {
                speak("Não consegui obter seu saldo. Verifique se está conectado.");
            }
        } else if (cleanCommand.includes('lucro') || cleanCommand.includes('resultado') || cleanCommand.includes('ganho')) {
            speak(`Seu lucro nesta sessão é de ${totalProfitRef.current.toFixed(2)} dólares.`);
        } else if (cleanCommand.includes('limpar') || cleanCommand.includes('reiniciar')) {
            resetOperations();
            speak("Histórico e lucros reiniciados.");
        } else if (cleanCommand.includes('olá') || cleanCommand.includes('oi') || cleanCommand.includes('ajuda') || cleanCommand.includes('siri') || cleanCommand.includes('alexa')) {
            speak("Olá! Eu sou a sua assistente Wave Sniper. Você pode me pedir para iniciar, parar, consultar o saldo ou o lucro da sessão.");
        } else {
            speak("Desculpe, não entendi o comando. Você pode dizer iniciar, parar, saldo ou lucro.");
        }
    }, [isBotRunning, toggleBot, accountBalance, resetOperations, speak]);

    // Função para iniciar o reconhecimento de voz
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            addLog("Reconhecimento de voz não suportado neste navegador.", "ERROR");
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setAiThought("Ouvindo comando de voz...");
        };

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setAiThought(`Você disse: "${text}"`);
            processVoiceCommand(text);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    }, [processVoiceCommand, addLog]);

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
    
    const handleConnect = useCallback((targetType?: 'real' | 'demo', targetToken?: string) => {
        const type = targetType || accountType;
        const token = targetToken || (type === 'real' ? realToken : demoToken);
        if (token) {
            setIsConnecting(true);
            if (isConnected) { disconnect(); connect(token, type); }
            else connect(token, type);
        }
    }, [accountType, realToken, demoToken, connect, disconnect, isConnected]);

    const contextValue = useMemo(() => ({
        ...stateAndSetters, isConnected, isConnecting, status, handleConnect, handleDisconnect: disconnect, 
        toggleBot, resetOperations, appFlow, setAppFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought,
        isVoiceEnabled, setIsVoiceEnabled, isSpeaking, speak, isListening, startListening
    }), [stateAndSetters, isConnected, isConnecting, status, handleConnect, disconnect, toggleBot, resetOperations, appFlow, selectedAIInfo, selectAI, exitToSelection, currentConfidence, aiThought, isVoiceEnabled, isSpeaking, speak, isListening, startListening]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;
};