"use client";

import { useState, useCallback } from 'react';
import { LogEntry, LogType, SignalEntry } from '@/types/bot';

const DEFAULTS = {
    realToken: '',
    demoToken: '',
    accountType: 'demo' as 'real' | 'demo',
    asset: '1HZ100V',
    duration: 1,
    initialStake: '0.35',
    digitTradeMode: 'evenOdd' as 'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal',
    attackMode: ['traditional'] as string[],
    digitPrediction: 4,
    overUnderDirection: 'OVER' as 'OVER' | 'UNDER',
    isManualMode: true,
    isManualGaleActive: false,
    martingaleFactor: '2.1', 
    maxLevels: 4,
    takeProfit: '2.00',
    stopLoss: '10.00',
    lossRecoveryStrategy: 'martingale' as 'martingale',
    isMartingaleActive: true,
    analyzerWindowSize: 500,
    consecutiveTarget: 3,
    entryDirection: 'AGAINST' as 'AGAINST' | 'FAVOR',
    isHybridModeActive: false,
    hybridWinsRequired: 2,
    scoreThreshold: 55,
    marketStabilityThreshold: '60',
    
    // Configurações de Banca Separadas
    realInitialBankroll: '100.00',
    demoInitialBankroll: '10000.00',
    realDailyGoalPercent: '5.0',
    demoDailyGoalPercent: '10.0',
    realDailyStopPercent: '15.0',
    demoDailyStopPercent: '50.0',
    realCurrentDay: 1,
    demoCurrentDay: 1,
    realActualBankroll: '100.00',
    demoActualBankroll: '10000.00',
    
    // Históricos Separados
    realBankHistory: [] as Array<{ day: number; initial: number; final: number; profit: number; status: 'win' | 'loss'; date: string }>,
    demoBankHistory: [] as Array<{ day: number; initial: number; final: number; profit: number; status: 'win' | 'loss'; date: string }>,
    
    // Resultados Separados
    realTotalProfit: 0.00,
    demoTotalProfit: 0.00,
    realWins: 0,
    demoWins: 0,
    realLosses: 0,
    demoLosses: 0,
    realSignals: [] as SignalEntry[],
    demoSignals: [] as SignalEntry[],

    isSmartModeActive: true,
    isSorosActive: false,
    sorosLevels: 2,
    sorosProfitPercentage: 50,
    autoSequenceActive: false,
    autoSequenceTrigger: 'O,O,O', 
    autoSequenceEntry: 'EVEN' as 'EVEN' | 'ODD', 
};

const getInitialState = () => {
    const savedStateJSON = localStorage.getItem('derivBotState');
    if (!savedStateJSON) return { ...DEFAULTS };
    try {
        const savedState = JSON.parse(savedStateJSON);
        return { ...DEFAULTS, ...savedState };
    } catch (e) {
        return { ...DEFAULTS };
    }
};

const initialState = getInitialState();

let signalIdCounter = 0;
const generateSignalId = () => `signal-${signalIdCounter++}`;

export const useBotState = () => {
    const [realToken, setRealToken] = useState(initialState.realToken);
    const [demoToken, setDemoToken] = useState(initialState.demoToken);
    const [accountType, setAccountType] = useState<'real' | 'demo'>(initialState.accountType);
    const [asset, setAsset] = useState(initialState.asset);
    const [duration, setDuration] = useState(initialState.duration);
    const [initialStake, setInitialStake] = useState(initialState.initialStake);
    const [digitTradeMode, setDigitTradeMode] = useState<'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal'>(initialState.digitTradeMode);
    const [attackMode, setAttackMode] = useState<string[]>(initialState.attackMode);
    const [digitPrediction, setDigitPrediction] = useState<number>(initialState.digitPrediction);
    const [overUnderDirection, setOverUnderDirection] = useState<'OVER' | 'UNDER'>(initialState.overUnderDirection);
    const [isManualMode, setIsManualMode] = useState(initialState.isManualMode);
    const [martingaleFactor, setMartingaleFactor] = useState(initialState.martingaleFactor);
    const [maxLevels, setMaxLevels] = useState(initialState.maxLevels);
    const [takeProfit, setTakeProfit] = useState(initialState.takeProfit);
    const [stopLoss, setStopLoss] = useState(initialState.stopLoss);
    const [isMartingaleActive, setIsMartingaleActive] = useState(initialState.isMartingaleActive);
    const [isBotRunning, setIsBotRunning] = useState(false);
    
    // Estados de Resultados Separados (Real vs Demo)
    const [realTotalProfit, setRealTotalProfit] = useState(initialState.realTotalProfit);
    const [demoTotalProfit, setDemoTotalProfit] = useState(initialState.demoTotalProfit);
    const [realWins, setRealWins] = useState(initialState.realWins);
    const [demoWins, setDemoWins] = useState(initialState.demoWins);
    const [realLosses, setRealLosses] = useState(initialState.realLosses);
    const [demoLosses, setDemoLosses] = useState(initialState.demoLosses);
    const [realSignals, setRealSignals] = useState<SignalEntry[]>(initialState.realSignals);
    const [demoSignals, setDemoSignals] = useState<SignalEntry[]>(initialState.demoSignals);

    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [multiAssetDigits, setMultiAssetDigits] = useState<Record<string, number[]>>({});
    
    const [lastTickEpoch, setLastTickEpoch] = useState<number | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [accountBalance, setAccountBalance] = useState<number | null>(null);
    const [tradeStatus, setTradeStatus] = useState<'IDLE' | 'SENDING' | 'ACTIVE'>('IDLE');
    const [isStudying, setIsStudying] = useState(false);
    const [studyTicksCount, setStudyTicksCount] = useState(0);
    const [consecutiveTarget, setConsecutiveTarget] = useState(initialState.consecutiveTarget);
    const [entryDirection, setEntryDirection] = useState<'AGAINST' | 'FAVOR'>(initialState.entryDirection);
    const [virtualLossStreak, setVirtualLossStreak] = useState(0);
    const [virtualTargetLosses, setVirtualTargetLosses] = useState(1); 
    const [isHybridModeActive, setIsHybridModeActive] = useState(initialState.isHybridModeActive);
    const [hybridWinsRequired, setHybridWinsRequired] = useState(initialState.hybridWinsRequired);
    const [isSmartModeActive, setIsSmartModeActive] = useState(initialState.isSmartModeActive);
    
    const [isSorosActive, setIsSorosActive] = useState(initialState.isSorosActive);
    const [sorosLevels, setSorosLevels] = useState(initialState.sorosLevels);
    const [sorosProfitPercentage, setSorosProfitPercentage] = useState(initialState.sorosProfitPercentage);

    const [isWaitingForRecoveryVirtual, setIsWaitingForRecoveryVirtual] = useState(false);

    const [analyzerWindowSize, setAnalyzerWindowSize] = useState(initialState.analyzerWindowSize);
    const [learningData, setLearningData] = useState<any>(null);
    const [scoreThreshold, setScoreThreshold] = useState(initialState.scoreThreshold);
    const [marketStabilityThreshold, setMarketStabilityThreshold] = useState(initialState.marketStabilityThreshold);
    
    // Gestão de Banca Separada (Real vs Demo)
    const [realInitialBankroll, setRealInitialBankroll] = useState(initialState.realInitialBankroll);
    const [demoInitialBankroll, setDemoInitialBankroll] = useState(initialState.demoInitialBankroll);
    const [realDailyGoalPercent, setRealDailyGoalPercent] = useState(initialState.realDailyGoalPercent);
    const [demoDailyGoalPercent, setDemoDailyGoalPercent] = useState(initialState.demoDailyGoalPercent);
    const [realDailyStopPercent, setRealDailyStopPercent] = useState(initialState.realDailyStopPercent);
    const [demoDailyStopPercent, setDemoDailyStopPercent] = useState(initialState.demoDailyStopPercent);
    const [realCurrentDay, setRealCurrentDay] = useState(initialState.realCurrentDay);
    const [demoCurrentDay, setDemoCurrentDay] = useState(initialState.demoCurrentDay);
    const [realActualBankroll, setRealActualBankroll] = useState(initialState.realActualBankroll);
    const [demoActualBankroll, setDemoActualBankroll] = useState(initialState.demoActualBankroll);
    const [realBankHistory, setRealBankHistory] = useState<Array<{ day: number; initial: number; final: number; profit: number; status: 'win' | 'loss'; date: string }>>(initialState.realBankHistory || []);
    const [demoBankHistory, setDemoBankHistory] = useState<Array<{ day: number; initial: number; final: number; profit: number; status: 'win' | 'loss'; date: string }>>(initialState.demoBankHistory || []);

    const [activeStrategy, setActiveStrategy] = useState<string | null>(null);
    const [neuralPredictions, setNeuralPredictions] = useState<number[]>([]);

    const [autoSequenceActive, setAutoSequenceActive] = useState(initialState.autoSequenceActive);
    const [autoSequenceTrigger, setAutoSequenceTrigger] = useState(initialState.autoSequenceTrigger);
    const [autoSequenceEntry, setAutoSequenceEntry] = useState<'EVEN' | 'ODD'>(initialState.autoSequenceEntry);

    // NOVOS ESTADOS: Detecção de Manipulação
    const [isManipulationDetected, setIsManipulationDetected] = useState(false);
    const [manipulationScore, setManipulationScore] = useState(0);

    const addLog = useCallback((message: string, type: LogType, details?: any) => {
        setLogs(prev => [{ timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message, type, ...details }, ...prev].slice(0, 50));
    }, []);

    return {
        realToken, setRealToken, demoToken, setDemoToken, accountType, setAccountType, asset, setAsset,
        duration, setDuration, initialStake, setInitialStake,
        digitTradeMode, setDigitTradeMode, attackMode, setAttackMode, digitPrediction, setDigitPrediction,
        isMartingaleActive, setIsMartingaleActive, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels,
        takeProfit, setTakeProfit, stopLoss, setStopLoss,
        isBotRunning, setIsBotRunning, isManualMode, setIsManualMode,
        
        // Expondo estados separados
        realTotalProfit, setRealTotalProfit,
        demoTotalProfit, setDemoTotalProfit,
        realWins, setRealWins,
        demoWins, setDemoWins,
        realLosses, setRealLosses,
        demoLosses, setDemoLosses,
        realSignals, setRealSignals,
        demoSignals, setDemoSignals,

        consecutiveLosses, setConsecutiveLosses,
        lastDigits, setLastDigits, 
        multiAssetDigits, setMultiAssetDigits,
        lastTickEpoch, setLastTickEpoch, logs, setLogs, accountBalance, setAccountBalance,
        tradeStatus, setTradeStatus, addLog,
        overUnderDirection, setOverUnderDirection,
        isStudying, setIsStudying, studyTicksCount, setStudyTicksCount,
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        virtualLossStreak, setVirtualLossStreak, virtualTargetLosses, setVirtualTargetLosses,
        isHybridModeActive, setIsHybridModeActive, hybridWinsRequired, setHybridWinsRequired,
        isSmartModeActive, setIsSmartModeActive,
        isWaitingForRecoveryVirtual, setIsWaitingForRecoveryVirtual,
        analyzerWindowSize, setAnalyzerWindowSize, learningData, setLearningData,
        scoreThreshold, setScoreThreshold, marketStabilityThreshold, setMarketStabilityThreshold,
        
        // Expondo estados de banca separados
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

        activeStrategy, setActiveStrategy, neuralPredictions, setNeuralPredictions,
        isSorosActive, setIsSorosActive, sorosLevels, setSorosLevels, sorosProfitPercentage, setSorosProfitPercentage,
        autoSequenceActive, setAutoSequenceActive,
        autoSequenceTrigger, setAutoSequenceTrigger,
        autoSequenceEntry, setAutoSequenceEntry,
        generateSignalId,

        // Expondo novos estados de manipulação
        isManipulationDetected, setIsManipulationDetected,
        manipulationScore, setManipulationScore
    };
};