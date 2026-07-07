"use client";

import { useState, useCallback } from 'react';
import { LogEntry, LogType, SignalEntry } from '@/types/bot';

export const DEFAULT_DERIV_APP_ID = '33yxEj8JnVc9XRyM6aB2n';

const DEFAULTS = {
    realToken: '',
    demoToken: '',
    accountId: '',
    appId: DEFAULT_DERIV_APP_ID,
    accountType: 'demo' as 'real' | 'demo',
    asset: '1HZ10V',
    duration: 3,
    initialStake: '0.35',
    digitTradeMode: 'evenOdd' as 'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal',
    attackMode: 'safe',
    digitPrediction: 1,
    overUnderDirection: 'OVER' as 'OVER' | 'UNDER',
    martingaleFactor: '2.1',
    maxLevels: 4,
    takeProfit: '2.00',
    stopLoss: '10.00',
    isMartingaleActive: true,
    analyzerWindowSize: 500,
    isManualMode: true,
    learningData: {},
    scoreThreshold: 0.7,
    marketStabilityThreshold: '55',
    bankManagementInitialBankroll: '100.00',
    bankManagementDailyGoalPercent: '5.0',
    bankManagementDailyStopPercent: '10.0',
    bankManagementCurrentDay: 1,
    bankManagementActualBankroll: '100.00',
    currency: 'USD',
    isSmartModeActive: false,
    virtualTargetLosses: 0,
};

const getInitialState = () => {
    const savedStateJSON = localStorage.getItem('derivBotState');
    if (!savedStateJSON) return { ...DEFAULTS };

    try {
        const savedState = JSON.parse(savedStateJSON);
        return {
            ...DEFAULTS,
            ...savedState,
            appId: !savedState.appId || savedState.appId === '1089' ? DEFAULT_DERIV_APP_ID : savedState.appId,
            asset: savedState.asset && (savedState.asset === '1HZ10V' || savedState.asset === 'R_100') ? savedState.asset : '1HZ10V',
            duration: savedState.duration !== undefined ? savedState.duration : 3,
        };
    } catch (e) {
        return { ...DEFAULTS };
    }
};

const initialState = getInitialState();

export const useBotState = () => {
    const [realToken, setRealToken] = useState(initialState.realToken);
    const [demoToken, setDemoToken] = useState(initialState.demoToken);
    const [accountId, setAccountId] = useState(initialState.accountId);
    const [appId, setAppId] = useState(initialState.appId);
    const [accountType, setAccountType] = useState<'real' | 'demo'>(initialState.accountType);
    const [asset, setAsset] = useState(initialState.asset);
    const [duration, setDuration] = useState(initialState.duration);
    const [initialStake, setInitialStake] = useState(initialState.initialStake);
    const [digitTradeMode, setDigitTradeMode] = useState(initialState.digitTradeMode);
    const [attackMode, setAttackMode] = useState(initialState.attackMode);
    const [digitPrediction, setDigitPrediction] = useState(initialState.digitPrediction);
    const [overUnderDirection, setOverUnderDirection] = useState(initialState.overUnderDirection);
    const [martingaleFactor, setMartingaleFactor] = useState(initialState.martingaleFactor);
    const [maxLevels, setMaxLevels] = useState(initialState.maxLevels);
    const [takeProfit, setTakeProfit] = useState(initialState.takeProfit);
    const [stopLoss, setStopLoss] = useState(initialState.stopLoss);
    const [isMartingaleActive, setIsMartingaleActive] = useState(initialState.isMartingaleActive);
    const [analyzerWindowSize, setAnalyzerWindowSize] = useState(initialState.analyzerWindowSize);
    const [isManualMode, setIsManualMode] = useState(initialState.isManualMode);

    const [learningData, setLearningData] = useState(initialState.learningData);
    const [scoreThreshold, setScoreThreshold] = useState(initialState.scoreThreshold);
    const [marketStabilityThreshold, setMarketStabilityThreshold] = useState(initialState.marketStabilityThreshold);

    const [bankManagementInitialBankroll, setBankManagementInitialBankroll] = useState(initialState.bankManagementInitialBankroll);
    const [bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent] = useState(initialState.bankManagementDailyGoalPercent);
    const [bankManagementDailyStopPercent, setBankManagementDailyStopPercent] = useState(initialState.bankManagementDailyStopPercent);
    const [bankManagementCurrentDay, setBankManagementCurrentDay] = useState(initialState.bankManagementCurrentDay);
    const [bankManagementActualBankroll, setBankManagementActualBankroll] = useState(initialState.bankManagementActualBankroll);
    const [currency, setCurrency] = useState(initialState.currency);

    const [isBotRunning, setIsBotRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isManipulationDetected, setIsManipulationDetected] = useState(false);
    const [isStudying, setIsStudying] = useState(true);
    const [currentConfidence, setCurrentConfidence] = useState(0);

    const [isSmartModeActive, setIsSmartModeActive] = useState(initialState.isSmartModeActive);
    const [virtualTargetLosses, setVirtualTargetLosses] = useState(initialState.virtualTargetLosses);
    const [virtualLossStreak, setVirtualLossStreak] = useState(0);
    const [isWaitingForVirtualResult, setIsWaitingForVirtualResult] = useState(false);
    const [isWaitingForRecoveryVirtual, setIsWaitingForRecoveryVirtual] = useState(false);

    const [isSorosActive, setIsSorosActive] = useState(false);
    const [sorosLevels, setSorosLevels] = useState(3);

    const [totalProfit, setTotalProfit] = useState(0.00);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [signals, setSignals] = useState<SignalEntry[]>([]);
    const [accountBalance, setAccountBalance] = useState<number | null>(null);
    const [tradeStatus, setTradeStatus] = useState<'IDLE' | 'SENDING' | 'ACTIVE'>('IDLE');
    const [lastTickEpoch, setLastTickEpoch] = useState<number | null>(null);
    const [multiAssetDigits, setMultiAssetDigits] = useState<Record<string, number[]>>({});
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);

    const addLog = useCallback((message: string, type: LogType, details?: any) => {
        setLogs(prev => [{
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
            message,
            type,
            ...details
        }, ...prev].slice(0, 50));
    }, []);

    const addSignal = useCallback((signal: Omit<SignalEntry, 'timestamp'> & { id?: string }) => {
        const id = signal.id || `signal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newSignal: SignalEntry = {
            ...signal,
            id,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false })
        } as SignalEntry;
        setSignals(prev => [newSignal, ...prev].slice(0, 100));
        return id;
    }, []);

    const updateSignalResult = useCallback((id: string, result: 'WIN' | 'LOSS', profit: number, stake: number | undefined, exitDigit?: number) => {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, result, profit, stake, exitDigit } : s));
    }, []);

    const clearSignals = useCallback(() => {
        setSignals([]);
    }, []);

    return {
        realToken, setRealToken, demoToken, setDemoToken, accountId, setAccountId, appId, setAppId, accountType, setAccountType,
        asset, setAsset, duration, setDuration, initialStake, setInitialStake,
        digitTradeMode, setDigitTradeMode, attackMode, setAttackMode, digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels,
        takeProfit, setTakeProfit, stopLoss, setStopLoss, isMartingaleActive, setIsMartingaleActive,
        analyzerWindowSize, setAnalyzerWindowSize, isManualMode, setIsManualMode,
        learningData, setLearningData, scoreThreshold, setScoreThreshold, marketStabilityThreshold, setMarketStabilityThreshold,
        bankManagementInitialBankroll, setBankManagementInitialBankroll, bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent, bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        currency, setCurrency,
        isBotRunning, setIsBotRunning, isPaused, setIsPaused, isManipulationDetected, setIsManipulationDetected,
        isStudying, setIsStudying, currentConfidence, setCurrentConfidence,
        isSmartModeActive, setIsSmartModeActive, virtualTargetLosses, setVirtualTargetLosses,
        virtualLossStreak, setVirtualLossStreak, isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        isWaitingForRecoveryVirtual, setIsWaitingForRecoveryVirtual,
        isSorosActive, setIsSorosActive, sorosLevels, setSorosLevels,
        totalProfit, setTotalProfit, wins, setWins, losses, setLosses,
        lastDigits, setLastDigits, logs, setLogs, signals, setSignals, accountBalance, setAccountBalance,
        tradeStatus, setTradeStatus, addLog, addSignal, updateSignalResult, clearSignals,
        lastTickEpoch, setLastTickEpoch, multiAssetDigits, setMultiAssetDigits,
        availableAccounts, setAvailableAccounts
    };
};