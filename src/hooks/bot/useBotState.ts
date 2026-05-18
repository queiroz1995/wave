"use client";

import { useState, useCallback } from 'react';
import { LogEntry, LogType, TradeType, SignalEntry, ContractType } from '@/types/bot';

const DEFAULTS = {
    realToken: '',
    demoToken: '',
    accountType: 'demo' as 'real' | 'demo',
    asset: '1HZ100V',
    duration: 1,
    initialStake: '1.00',
    digitTradeMode: 'evenOdd' as 'evenOdd' | 'overUnder',
    digitPrediction: 5,
    overUnderDirection: 'OVER' as 'OVER' | 'UNDER',
    isManualMode: true,
    isManualGaleActive: false,
    martingaleFactor: '1.8', 
    maxLevels: 3,
    takeProfit: '10.00',
    stopLoss: '50.00',
    lossRecoveryStrategy: 'martingale' as 'martingale',
    targetProfitPerTrade: '0.35',
    activeStrategy: 'trendSurfer' as 'trendSurfer' | 'xHunter',
    minWinRate: 55,
    marketStabilityThreshold: '10',
    colorPatternProfiles: {},
    overUnderPatternProfiles: {},
    analyzerWindowSize: 500,
    patternLengthForAnalysis: 3,
    catalogerPatternLength: 3,
    catalogerMinWinRate: 75,
    bankManagementInitialBankroll: '100',
    bankManagementDailyGoalPercent: '5',
    bankManagementDailyStopPercent: '10',
    bankManagementCurrentDay: 1,
    bankManagementActualBankroll: '100',
    catalogerMartingaleLevels: 0,
    catalogerMinOccurrences: 5,
    martingaleMode: 'IMMEDIATE' as 'IMMEDIATE',
    isMartingaleActive: true,
    isUserDisconnected: false,
    isDoubleOneTriggerActive: false,
    doubleOneTriggerCount: 2, 
    maxTrades: 0,
    isSorosActive: false,
    sorosLevels: 0,
    sorosProfitPercentage: 0,
    virtualLossStreak: 0,
    virtualWinStreak: 0,
    isWaitingForVirtualResult: false,
    virtualTargetLosses: 0,
    virtualTargetWins: 0,
    isStreakFilterActive: true,
    maxStreakAllowed: 4,
    scoreThreshold: 4,
    learningData: {} as Record<string, { wins: number, losses: number, total: number }>,
    isSoundEnabled: true,
};

const getInitialState = () => {
    const savedStateJSON = localStorage.getItem('derivBotState');
    if (!savedStateJSON) return { ...DEFAULTS, bankManagementActualBankroll: DEFAULTS.bankManagementInitialBankroll };
    try {
        const savedState = JSON.parse(savedStateJSON);
        return { ...DEFAULTS, ...savedState };
    } catch (e) {
        return { ...DEFAULTS, bankManagementActualBankroll: DEFAULTS.bankManagementInitialBankroll };
    }
};

const initialState = getInitialState();

let signalIdCounter = 0;
const generateSignalId = () => `signal-${signalIdCounter++}`;

export const useBotState = () => {
    const [realToken, setRealToken] = useState(initialState.realToken);
    const [demoToken, setDemoToken] = useState(initialState.demoToken);
    const [accountType, setAccountType] = useState<'real' | 'demo'>(initialState.accountType);
    const [isUserDisconnected, setIsUserDisconnected] = useState(initialState.isUserDisconnected);
    const [asset, setAsset] = useState(initialState.asset);
    const [duration, setDuration] = useState(initialState.duration);
    const [initialStake, setInitialStake] = useState(initialState.initialStake);
    const [digitTradeMode, setDigitTradeMode] = useState<'evenOdd' | 'overUnder'>(initialState.digitTradeMode);
    const [digitPrediction, setDigitPrediction] = useState<number>(initialState.digitPrediction);
    const [overUnderDirection, setOverUnderDirection] = useState<'OVER' | 'UNDER'>(initialState.overUnderDirection);
    const [isManualMode, setIsManualMode] = useState(initialState.isManualMode);
    const [isManualGaleActive, setIsManualGaleActive] = useState(initialState.isManualGaleActive);
    const [martingaleFactor, setMartingaleFactor] = useState(initialState.martingaleFactor);
    const [maxLevels, setMaxLevels] = useState(initialState.maxLevels);
    const [takeProfit, setTakeProfit] = useState(initialState.takeProfit);
    const [stopLoss, setStopLoss] = useState(initialState.stopLoss);
    const [lossRecoveryStrategy, setLossRecoveryStrategy] = useState<'martingale'>(initialState.lossRecoveryStrategy);
    const [isMartingaleActive, setIsMartingaleActive] = useState(initialState.isMartingaleActive);
    const [martingaleMode, setMartingaleMode] = useState<'IMMEDIATE'>(initialState.martingaleMode);
    const [activeStrategy, setActiveStrategy] = useState<'trendSurfer' | 'xHunter'>(initialState.activeStrategy);
    const [marketStabilityThreshold, setMarketStabilityThreshold] = useState<number | string>(initialState.marketStabilityThreshold);
    const [analyzerWindowSize, setAnalyzerWindowSize] = useState(initialState.analyzerWindowSize);
    const [isBotRunning, setIsBotRunning] = useState(false);
    const [totalProfit, setTotalProfit] = useState(0.00);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseTimeRemaining, setPauseTimeRemaining] = useState(0);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [lastTickEpoch, setLastTickEpoch] = useState<number | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [signals, setSignals] = useState<SignalEntry[]>([]);
    const [accountBalance, setAccountBalance] = useState<number | null>(null);
    const [tradeStatus, setTradeStatus] = useState<'IDLE' | 'SENDING' | 'ACTIVE'>('IDLE');
    const [probabilities, setProbabilities] = useState({ even: 50, odd: 50 });
    const [learningData, setLearningData] = useState(initialState.learningData);
    const [scoreThreshold, setScoreThreshold] = useState(initialState.scoreThreshold);
    const [isManipulationDetected, setIsManipulationDetected] = useState(false);
    const [neuralPredictions, setNeuralPredictions] = useState<number[]>(new Array(10).fill(10));
    const [isSoundEnabled, setIsSoundEnabled] = useState(initialState.isSoundEnabled);

    // Estados de inteligência pós-red
    const [isStudying, setIsStudying] = useState(false);
    const [studyTicksCount, setStudyTicksCount] = useState(0);

    // Estados da Planilha de Gestão
    const [bankManagementInitialBankroll, setBankManagementInitialBankroll] = useState(initialState.bankManagementInitialBankroll);
    const [bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent] = useState(initialState.bankManagementDailyGoalPercent);
    const [bankManagementDailyStopPercent, setBankManagementDailyStopPercent] = useState(initialState.bankManagementDailyStopPercent);
    const [bankManagementCurrentDay, setBankManagementCurrentDay] = useState(initialState.bankManagementCurrentDay);
    const [bankManagementActualBankroll, setBankManagementActualBankroll] = useState(initialState.bankManagementActualBankroll);

    const [maxTrades, setMaxTrades] = useState(initialState.maxTrades);
    const [isSorosActive, setIsSorosActive] = useState(initialState.isSorosActive);
    const [sorosLevels, setSorosLevels] = useState(initialState.sorosLevels);
    const [sorosProfitPercentage, setSorosProfitPercentage] = useState(initialState.sorosProfitPercentage);
    const [isStreakFilterActive, setIsStreakFilterActive] = useState(initialState.isStreakFilterActive);
    const [maxStreakAllowed, setMaxStreakAllowed] = useState(initialState.maxStreakAllowed);
    
    const [virtualLossStreak, setVirtualLossStreak] = useState(initialState.virtualLossStreak);
    const [virtualWinStreak, setVirtualWinStreak] = useState(initialState.virtualWinStreak);
    const [virtualTargetLosses, setVirtualTargetLosses] = useState(initialState.virtualTargetLosses);
    const [virtualTargetWins, setVirtualTargetWins] = useState(initialState.virtualTargetWins);
    const [isWaitingForVirtualResult, setIsWaitingForVirtualResult] = useState(initialState.isWaitingForVirtualResult);

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
        digitTradeMode, setDigitTradeMode, digitPrediction, setDigitPrediction,
        isMartingaleActive, setIsMartingaleActive, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels,
        takeProfit, setTakeProfit, stopLoss, setStopLoss, martingaleMode, setMartingaleMode,
        isBotRunning, setIsBotRunning, isManualMode, setIsManualMode, isManualGaleActive, setIsManualGaleActive,
        totalProfit, setTotalProfit, wins, setWins, losses, setLosses,
        consecutiveLosses, setConsecutiveLosses, isPaused, setIsPaused, pauseTimeRemaining, setPauseTimeRemaining,
        lastDigits, setLastDigits, lastTickEpoch, setLastTickEpoch, logs, setLogs, signals, accountBalance, setAccountBalance,
        tradeStatus, setTradeStatus, probabilities, setProbabilities, learningData, setLearningData, scoreThreshold,
        addLog, addSignal, updateSignalResult, activeStrategy, setActiveStrategy, analyzerWindowSize, setAnalyzerWindowSize,
        overUnderDirection, setOverUnderDirection, marketStabilityThreshold, setMarketStabilityThreshold,
        isManipulationDetected, setIsManipulationDetected, neuralPredictions, setNeuralPredictions,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        maxTrades, setMaxTrades, isSorosActive, setIsSorosActive, sorosLevels, setSorosLevels, sorosProfitPercentage, setSorosProfitPercentage,
        isStreakFilterActive, setIsStreakFilterActive, maxStreakAllowed, setMaxStreakAllowed,
        virtualLossStreak, setVirtualLossStreak, virtualWinStreak, setVirtualWinStreak, 
        virtualTargetLosses, setVirtualTargetLosses, virtualTargetWins, setVirtualTargetWins,
        isWaitingForVirtualResult, setIsWaitingForVirtualResult, lossRecoveryStrategy, setLossRecoveryStrategy,
        isStudying, setIsStudying, studyTicksCount, setStudyTicksCount,
        isSoundEnabled, setIsSoundEnabled
    };
};