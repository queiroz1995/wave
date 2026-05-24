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
    bankManagementInitialBankroll: '20.00',
    bankManagementDailyGoalPercent: '10.0',
    bankManagementDailyStopPercent: '50.0',
    bankManagementCurrentDay: 1,
    bankManagementActualBankroll: '20.00',
    isSmartModeActive: true,
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
    const [totalProfit, setTotalProfit] = useState(0.00);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [multiAssetDigits, setMultiAssetDigits] = useState<Record<string, number[]>>({});
    
    const [lastTickEpoch, setLastTickEpoch] = useState<number | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [signals, setSignals] = useState<SignalEntry[]>([]);
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
    
    const [analyzerWindowSize, setAnalyzerWindowSize] = useState(initialState.analyzerWindowSize);
    const [learningData, setLearningData] = useState<any>(null);
    const [scoreThreshold, setScoreThreshold] = useState(initialState.scoreThreshold);
    const [marketStabilityThreshold, setMarketStabilityThreshold] = useState(initialState.marketStabilityThreshold);
    const [bankManagementInitialBankroll, setBankManagementInitialBankroll] = useState(initialState.bankManagementInitialBankroll);
    const [bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent] = useState(initialState.bankManagementDailyGoalPercent);
    const [bankManagementDailyStopPercent, setBankManagementDailyStopPercent] = useState(initialState.bankManagementDailyStopPercent);
    const [bankManagementCurrentDay, setBankManagementCurrentDay] = useState(initialState.bankManagementCurrentDay);
    const [bankManagementActualBankroll, setBankManagementActualBankroll] = useState(initialState.bankManagementActualBankroll);
    const [activeStrategy, setActiveStrategy] = useState<string | null>(null);
    const [neuralPredictions, setNeuralPredictions] = useState<number[]>([]);

    const addLog = useCallback((message: string, type: LogType, details?: any) => {
        setLogs(prev => [{ timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message, type, ...details }, ...prev].slice(0, 50));
    }, []);

    const addSignal = useCallback((signal: Omit<SignalEntry, 'timestamp' | 'id'>) => {
        const newSignal: SignalEntry = { ...signal, id: generateSignalId(), timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }) };
        setSignals(prev => [newSignal, ...prev].slice(0, 100));
        return newSignal.id;
    }, []);

    const updateSignalResult = useCallback((id: string, result: 'WIN' | 'LOSS', profit: number, stake: number | undefined, exitDigit?: number) => {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, result, profit, stake, exitDigit } : s));
    }, []);

    return {
        realToken, setRealToken, demoToken, setDemoToken, accountType, setAccountType, asset, setAsset,
        duration, setDuration, initialStake, setInitialStake,
        digitTradeMode, setDigitTradeMode, attackMode, setAttackMode, digitPrediction, setDigitPrediction,
        isMartingaleActive, setIsMartingaleActive, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels,
        takeProfit, setTakeProfit, stopLoss, setStopLoss,
        isBotRunning, setIsBotRunning, isManualMode, setIsManualMode,
        totalProfit, setTotalProfit, wins, setWins, losses, setLosses,
        consecutiveLosses, setConsecutiveLosses,
        lastDigits, setLastDigits, 
        multiAssetDigits, setMultiAssetDigits,
        lastTickEpoch, setLastTickEpoch, logs, setLogs, signals, setSignals, accountBalance, setAccountBalance,
        tradeStatus, setTradeStatus, addLog, addSignal, updateSignalResult,
        overUnderDirection, setOverUnderDirection,
        isStudying, setIsStudying, studyTicksCount, setStudyTicksCount,
        consecutiveTarget, setConsecutiveTarget, entryDirection, setEntryDirection,
        virtualLossStreak, setVirtualLossStreak, virtualTargetLosses, setVirtualTargetLosses,
        isHybridModeActive, setIsHybridModeActive, hybridWinsRequired, setHybridWinsRequired,
        isSmartModeActive, setIsSmartModeActive,
        analyzerWindowSize, setAnalyzerWindowSize, learningData, setLearningData,
        scoreThreshold, setScoreThreshold, marketStabilityThreshold, setMarketStabilityThreshold,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        activeStrategy, setActiveStrategy, neuralPredictions, setNeuralPredictions
    };
};