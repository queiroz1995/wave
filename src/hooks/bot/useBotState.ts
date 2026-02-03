"use client";

import { useState, useCallback } from 'react';
import { LogEntry, LogType, TradeType, SignalEntry, ContractType } from '@/types/bot';

export const AVAILABLE_ASSETS = [
    { id: 'R_10', name: 'Volatility 10 (Normal)' },
    { id: '1HZ10V', name: 'Volatility 10 (1s)' },
    { id: 'R_25', name: 'Volatility 25 (Normal)' },
    { id: '1HZ25V', name: 'Volatility 25 (1s)' },
    { id: 'R_50', name: 'Volatility 50 (Normal)' },
    { id: '1HZ50V', name: 'Volatility 50 (1s)' },
    { id: 'R_75', name: 'Volatility 75 (Normal)' },
    { id: '1HZ75V', name: 'Volatility 75 (1s)' },
    { id: 'R_100', name: 'Volatility 100 (Normal)' },
    { id: '1HZ100V', name: 'Volatility 100 (1s)' },
];

const DEFAULTS = {
    realToken: '',
    demoToken: '',
    accountType: 'demo' as 'real' | 'demo',
    asset: '1HZ10V', 
    duration: 1,
    initialStake: '1.00',
    digitTradeMode: 'evenOdd' as 'evenOdd' | 'overUnder',
    digitPrediction: 1,
    overUnderDirection: 'OVER' as 'OVER' | 'UNDER',
    isManualMode: true,
    isManualGaleActive: false,
    martingaleFactor: '2.2',
    maxLevels: 3,
    takeProfit: '100.00',
    stopLoss: '500.00',
    lossRecoveryStrategy: 'martingale' as 'martingale',
    targetProfitPerTrade: '0.35',
    activeStrategy: 'smartAI' as any,
    minWinRate: 55,
    marketStabilityThreshold: '10',
    colorPatternProfiles: {},
    overUnderPatternProfiles: {},
    imbalanceAnalysisWindow: 15,
    imbalanceTriggerPercentage: 60,
    imbalanceTradeMode: 'reversal' as 'reversal' | 'trend',
    analyzerMinWinRate: 75,
    analyzerAutoTrade: true,
    dynamicAnalysisWindow: 0,
    analyzerWindowSize: 100, 
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
    surferAnalysisWindow: 10,
    surferTriggerPercentage: 55,
    surferMartingaleDirection: 'TREND' as 'TREND' | 'REVERSAL', 
    martingaleMode: 'IMMEDIATE' as 'IMMEDIATE',
    isMartingaleActive: true,
    isUserDisconnected: false,
    lastSurferWinResult: null as 'EVEN' | 'ODD' | null,
    isDoubleOneTriggerActive: false,
    doubleOneTriggerCount: 2, 
    doubleOneTriggerTargetDigits: [1],
    maxTrades: 0,
    isSorosActive: false,
    sorosLevels: 0,
    sorosProfitPercentage: 0,
    virtualLossStreak: 0,
    virtualWinStreak: 0,
    isWaitingForVirtualResult: false,
    virtualTargetLosses: 3,
    virtualTargetWins: 0,
    isStreakFilterActive: true,
    maxStreakAllowed: 2,
    marketPulse: 'stable' as 'calm' | 'stable' | 'aggressive',
    // ROULETTE STATES
    isRouletteMode: true, // Sempre True agora
    rouletteTimer: 16,
    isRouletteSpinning: false,
    rouletteHistory: [] as number[],
    selectedRouletteNumbers: [] as number[],
};

const getInitialState = () => {
    const savedStateJSON = localStorage.getItem('derivBotState');
    if (!savedStateJSON) return { ...DEFAULTS };
    try {
        const savedState = JSON.parse(savedStateJSON);
        return { ...DEFAULTS, ...savedState, isRouletteMode: true };
    } catch (e) {
        return { ...DEFAULTS, isRouletteMode: true };
    }
};

const initialState = getInitialState();

export const useBotState = () => {
    const [realToken, setRealToken] = useState(initialState.realToken);
    const [demoToken, setDemoToken] = useState(initialState.demoToken);
    const [accountType, setAccountType] = useState<'real' | 'demo'>(initialState.accountType);
    const [isUserDisconnected, setIsUserDisconnected] = useState(initialState.isUserDisconnected);
    const [asset, setAsset] = useState(initialState.asset);
    const [duration, setDuration] = useState(initialState.duration);
    const [durationUnit] = useState<'t'>('t');
    const [initialStake, setInitialStake] = useState(initialState.initialStake);
    const [tradeType] = useState<TradeType>('digit');
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
    const [targetProfitPerTrade, setTargetProfitPerTrade] = useState(initialState.targetProfitPerTrade);
    const [martingaleMode, setMartingaleMode] = useState<'IMMEDIATE'>(initialState.martingaleMode);
    const [maxTrades, setMaxTrades] = useState(initialState.maxTrades);
    const [isMartingaleActive, setIsMartingaleActive] = useState(initialState.isMartingaleActive);
    const [activeStrategy, setActiveStrategy] = useState(initialState.activeStrategy);
    const [minWinRate, setMinWinRate] = useState<number | string>(initialState.minWinRate);
    const [marketStabilityThreshold, setMarketStabilityThreshold] = useState<number | string>(initialState.marketStabilityThreshold);
    const [colorPatternProfiles, setColorPatternProfiles] = useState(initialState.colorPatternProfiles);
    const [overUnderPatternProfiles, setOverUnderPatternProfiles] = useState(initialState.overUnderPatternProfiles);
    const [imbalanceAnalysisWindow, setImbalanceAnalysisWindow] = useState(initialState.imbalanceAnalysisWindow);
    const [imbalanceTriggerPercentage, setImbalanceTriggerPercentage] = useState(initialState.imbalanceTriggerPercentage);
    const [imbalanceTradeMode, setImbalanceTradeMode] = useState<'reversal' | 'trend'>(initialState.imbalanceTradeMode);
    const [analyzerMinWinRate, setAnalyzerMinWinRate] = useState(initialState.analyzerMinWinRate);
    const [analyzerAutoTrade, setAnalyzerAutoTrade] = useState(initialState.analyzerAutoTrade);
    const [dynamicAnalysisWindow, setDynamicAnalysisWindow] = useState(initialState.dynamicAnalysisWindow);
    const [surferAnalysisWindow, setSurferAnalysisWindow] = useState(initialState.surferAnalysisWindow);
    const [surferTriggerPercentage, setSurferTriggerPercentage] = useState(initialState.surferTriggerPercentage);
    const [surferMartingaleDirection, setSurferMartingaleDirection] = useState<'TREND' | 'REVERSAL'>(initialState.surferMartingaleDirection);
    const [lastSurferWinResult, setLastSurferWinResult] = useState<'EVEN' | 'ODD' | null>(initialState.lastSurferWinResult);
    const [analyzerWindowSize, setAnalyzerWindowSize] = useState(initialState.analyzerWindowSize);
    const [patternLengthForAnalysis, setPatternLengthForAnalysis] = useState(initialState.patternLengthForAnalysis);
    const [catalogerPatternLength, setCatalogerPatternLength] = useState(initialState.catalogerPatternLength);
    const [catalogerMinWinRate, setCatalogerMinWinRate] = useState(initialState.catalogerMinWinRate);
    const [catalogerMartingaleLevels, setCatalogerMartingaleLevels] = useState(initialState.catalogerMartingaleLevels);
    const [catalogerMinOccurrences, setCatalogerMinOccurrences] = useState(initialState.catalogerMinOccurrences);
    const [isDoubleOneTriggerActive, setIsDoubleOneTriggerActive] = useState(initialState.isDoubleOneTriggerActive);
    const [doubleOneTriggerCount, setDoubleOneTriggerCount] = useState(initialState.doubleOneTriggerCount);
    const [doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits] = useState<number[]>(initialState.doubleOneTriggerTargetDigits);
    const [bankManagementInitialBankroll, setBankManagementInitialBankroll] = useState(initialState.bankManagementInitialBankroll);
    const [bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent] = useState(initialState.bankManagementDailyGoalPercent);
    const [bankManagementDailyStopPercent, setBankManagementDailyStopPercent] = useState(initialState.bankManagementDailyStopPercent);
    const [bankManagementCurrentDay, setBankManagementCurrentDay] = useState(initialState.bankManagementCurrentDay);
    const [bankManagementActualBankroll, setBankManagementActualBankroll] = useState(initialState.bankManagementActualBankroll);
    const [isSorosActive, setIsSorosActive] = useState(initialState.isSorosActive);
    const [sorosLevels, setSorosLevels] = useState(initialState.sorosLevels);
    const [sorosProfitPercentage, setSorosProfitPercentage] = useState(initialState.sorosProfitPercentage);
    const [virtualLossStreak, setVirtualLossStreak] = useState(initialState.virtualLossStreak);
    const [virtualWinStreak, setVirtualWinStreak] = useState(initialState.virtualWinStreak);
    const [isWaitingForVirtualResult, setIsWaitingForVirtualResult] = useState(initialState.isWaitingForVirtualResult);
    const [virtualTargetLosses, setVirtualTargetLosses] = useState(initialState.virtualTargetLosses);
    const [virtualTargetWins, setVirtualTargetWins] = useState(initialState.virtualTargetWins);
    const [isStreakFilterActive, setIsStreakFilterActive] = useState(initialState.isStreakFilterActive);
    const [maxStreakAllowed, setMaxStreakAllowed] = useState(initialState.maxStreakAllowed);

    const [marketPulse, setMarketPulse] = useState<'calm' | 'stable' | 'aggressive'>(initialState.marketPulse);

    // ROULETTE STATES
    const [isRouletteMode, setIsRouletteMode] = useState(true); // Sempre True
    const [rouletteTimer, setRouletteTimer] = useState(initialState.rouletteTimer);
    const [isRouletteSpinning, setIsRouletteSpinning] = useState(initialState.isRouletteSpinning);
    const [rouletteHistory, setRouletteHistory] = useState<number[]>(initialState.rouletteHistory);
    const [selectedRouletteNumbers, setSelectedRouletteNumbers] = useState<number[]>(initialState.selectedRouletteNumbers);

    const [isBotRunning, setIsBotRunning] = useState(false);
    const [manualGaleLevel, setManualGaleLevel] = useState(0);
    const [currentSignal, _setCurrentSignal] = useState<'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | null>(null);
    const [currentSignalDetails, setCurrentSignalDetails] = useState<{ strategyName: string, winRate: number, signalId?: string | null } | null>(null);
    const [totalProfit, setTotalProfit] = useState(0.00);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [lastDigits, setLastDigits] = useState<number[]>([]);
    const [lastTickEpoch, setLastTickEpoch] = useState<number | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [signals, setSignals] = useState<SignalEntry[]>([]);
    const [percentages, setPercentages] = useState({ odd: 0, even: 0 });
    const [chartData, setChartData] = useState<{ time: string; price: number }[]>([]);
    const [accountBalance, setAccountBalance] = useState<number | null>(null);
    const [activeContract, setActiveContract] = useState<any | null>(null);
    const [tradeStatus, setTradeStatus] = useState<'IDLE' | 'SENDING' | 'ACTIVE'>('IDLE');
    const [closedHistory, setClosedHistory] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    // FUNÇÕES UTILITÁRIAS
    const addLog = useCallback((message: string, type: LogType, details?: { stake?: number, profit?: number, strategyName?: string, exitDigit?: number, contractType?: ContractType, barrier?: number }) => {
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message, type, ...details }].slice(-100));
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    const addSignal = useCallback((signal: Omit<SignalEntry, 'timestamp' | 'id'>) => {
        const id = `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSignal: SignalEntry = { 
            ...signal, 
            id, 
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), 
            winRate: signal.winRate || 'N/A' 
        };
        setSignals(prev => [newSignal, ...prev].slice(0, 100));
        return id;
    }, []);

    const updateSignalResult = useCallback((id: string, result: 'WIN' | 'LOSS', profit: number, stake: number | undefined, exitDigit?: number) => {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, result, profit, stake, exitDigit } : s));
    }, []);

    const clearSignals = useCallback(() => setSignals([]), []);

    const setCurrentSignal = useCallback((signal: 'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | null, details?: { strategyName: string, winRate: number, signalId?: string | null }) => {
        _setCurrentSignal(signal);
        setCurrentSignalDetails(details || null);
    }, []);

    return {
        realToken, setRealToken, demoToken, setDemoToken, accountType, setAccountType, asset, setAsset,
        duration, setDuration, durationUnit, initialStake, setInitialStake, tradeType,
        digitTradeMode, setDigitTradeMode, digitPrediction, setDigitPrediction,
        minWinRate, setMinWinRate, marketStabilityThreshold, setMarketStabilityThreshold,
        colorPatternProfiles, setColorPatternProfiles,
        overUnderPatternProfiles, setOverUnderPatternProfiles,
        martingaleMode, setMartingaleMode, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels, takeProfit, setTakeProfit, stopLoss, setStopLoss,
        isBotRunning, setIsBotRunning, isManualMode, setIsManualMode, isManualGaleActive, setIsManualGaleActive, manualGaleLevel, setManualGaleLevel,
        currentSignal, setCurrentSignal, currentSignalDetails,
        totalProfit, setTotalProfit, wins, setWins, losses, setLosses,
        lastDigits, setLastDigits,
        lastTickEpoch, setLastTickEpoch, logs, setLogs,
        signals, percentages, setPercentages, chartData, setChartData, accountBalance, setAccountBalance,
        activeContract, setActiveContract, tradeStatus, setTradeStatus,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        lossRecoveryStrategy, setLossRecoveryStrategy,
        activeStrategy, setActiveStrategy, imbalanceAnalysisWindow, setImbalanceAnalysisWindow,
        imbalanceTriggerPercentage, setImbalanceTriggerPercentage, imbalanceTradeMode, setImbalanceTradeMode,
        analyzerWindowSize, setAnalyzerWindowSize,
        patternLengthForAnalysis, setPatternLengthForAnalysis,
        analyzerMinWinRate, setAnalyzerMinWinRate,
        analyzerAutoTrade, setAnalyzerAutoTrade,
        closedHistory, setClosedHistory,
        isFetchingHistory, setIsFetchingHistory,
        catalogerPatternLength, setCatalogerPatternLength,
        catalogerMinWinRate, setCatalogerMinWinRate,
        dynamicAnalysisWindow, setDynamicAnalysisWindow,
        overUnderDirection, setOverUnderDirection,
        catalogerMartingaleLevels, setCatalogerMartingaleLevels,
        catalogerMinOccurrences, setCatalogerMinOccurrences,
        isUserDisconnected, setIsUserDisconnected,
        isDoubleOneTriggerActive, setIsDoubleOneTriggerActive,
        doubleOneTriggerCount, setDoubleOneTriggerCount,
        doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits,
        maxTrades, setMaxTrades,
        isSorosActive, setIsSorosActive,
        sorosLevels, setSorosLevels,
        sorosProfitPercentage, setSorosProfitPercentage,
        isMartingaleActive, setIsMartingaleActive,
        virtualLossStreak, setVirtualLossStreak,
        virtualWinStreak, setVirtualWinStreak,
        isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
        marketPulse, setMarketPulse,
        targetProfitPerTrade, setTargetProfitPerTrade,
        addLog, clearLogs, addSignal, clearSignals, updateSignalResult,
        // ROULETTE
        isRouletteMode, setIsRouletteMode,
        rouletteHistory, setRouletteHistory,
        rouletteTimer, setRouletteTimer,
        isRouletteSpinning, setIsRouletteSpinning,
        selectedRouletteNumbers, setSelectedRouletteNumbers,
    };
};