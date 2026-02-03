"use client";

import { useState, useCallback } from 'react';
import { LogEntry, LogType, TradeType, SignalEntry, ContractType } from '@/types/bot';

// Define all default values in one place for consistency.
const DEFAULTS = {
    realToken: '',
    demoToken: '',
    accountType: 'demo' as 'real' | 'demo',
    asset: '1HZ100V',
    duration: 1,
    initialStake: '0.35',
    digitTradeMode: 'evenOdd' as 'evenOdd' | 'overUnder',
    digitPrediction: 1,
    overUnderDirection: 'OVER' as 'OVER' | 'UNDER',
    isManualMode: true,
    isManualGaleActive: false,
    martingaleFactor: '2.2',
    maxLevels: 3,
    takeProfit: '10.00',
    stopLoss: '50.00',
    lossRecoveryStrategy: 'martingale' as 'martingale',
    targetProfitPerTrade: '0.35',
    activeStrategy: 'smartAI' as 'colorPattern' | 'imbalance' | 'analyzer' | 'dynamicDigit' | 'smartAI' | 'doubleOneTrigger',
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
    analyzerWindowSize: 250,
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
    // NOVOS ESTADOS PARA OPERAÇÃO MANUAL INOVADORA
    isManualSniperMode: false,
    marketPulse: 'stable' as 'calm' | 'stable' | 'aggressive',
    maxMarketSpeed: 1.5, // Segundos entre ticks
};

const getInitialState = () => {
    const savedStateJSON = localStorage.getItem('derivBotState');
    if (!savedStateJSON) {
        return { ...DEFAULTS, bankManagementActualBankroll: DEFAULTS.bankManagementInitialBankroll };
    }

    try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.lossRecoveryStrategy !== 'martingale') {
            savedState.lossRecoveryStrategy = 'martingale';
        }
        if (savedState.martingaleMode !== 'IMMEDIATE') {
            savedState.martingaleMode = 'IMMEDIATE';
        }
        
        const mergedState = { ...DEFAULTS, ...savedState };
        
        if (!savedState.bankManagementActualBankroll) {
            mergedState.bankManagementActualBankroll = mergedState.bankManagementInitialBankroll;
        }
        
        const allowedStrategies = ['smartAI', 'doubleOneTrigger', 'colorPattern'];
        if (!allowedStrategies.includes(mergedState.activeStrategy)) {
            mergedState.activeStrategy = DEFAULTS.activeStrategy;
        }

        return mergedState;
    } catch (e) {
        localStorage.removeItem('derivBotState');
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
    const [activeStrategy, setActiveStrategy] = useState<'colorPattern' | 'imbalance' | 'analyzer' | 'dynamicDigit' | 'smartAI' | 'doubleOneTrigger'>(initialState.activeStrategy);
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

    // NOVOS ESTADOS INOVADORES
    const [isManualSniperMode, setIsManualSniperMode] = useState(initialState.isManualSniperMode);
    const [marketPulse, setMarketPulse] = useState<'calm' | 'stable' | 'aggressive'>(initialState.marketPulse);
    const [maxMarketSpeed, setMaxMarketSpeed] = useState(initialState.maxMarketSpeed);

    const [isBotRunning, setIsBotRunning] = useState(false);
    const [manualGaleLevel, setManualGaleLevel] = useState(0);
    const [currentSignal, _setCurrentSignal] = useState<'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | null>(null);
    const [currentSignalDetails, setCurrentSignalDetails] = useState<{ strategyName: string, winRate: number, signalId?: string | null } | null>(null);
    const [matchedPatternInfo, setMatchedPatternInfo] = useState<{ name: string; length: number } | null>(null);
    const [totalProfit, setTotalProfit] = useState(0.00);
    const [peakProfit, setPeakProfit] = useState(0.00);
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [totalTradesMade, setTotalTradesMade] = useState(0);
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
    const [marketTrend, setMarketTrend] = useState(0);
    const [profiles, setProfiles] = useState({});
    const [catalogAnalysisWindow, setCatalogAnalysisWindow] = useState(100);
    const [lastLosingContractType, setLastLosingContractType] = useState<ContractType | null>(null);
    const [lastLosingBarrier, setLastLosingBarrier] = useState<number | null>(null);
    const [sorosLevel, setSorosLevel] = useState(0);
    const [lastTradeProfit, setLastTradeProfit] = useState(0);

    const addLog = useCallback((message: string, type: LogType, details?: { stake?: number, profit?: number, strategyName?: string, exitDigit?: number, contractType?: ContractType, barrier?: number }) => {
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message, type, ...details }].slice(-100));
    }, []);
    const clearLogs = useCallback(() => setLogs([]), []);
    const addSignal = useCallback((signal: Omit<SignalEntry, 'timestamp' | 'id'>) => {
        const newSignal: SignalEntry = { ...signal, id: generateSignalId(), timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), winRate: signal.winRate || 'N/A' };
        setSignals(prev => [newSignal, ...prev].slice(0, 100));
        return newSignal.id;
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
        minWinRate, setMinWinRate, marketStabilityThreshold, setMarketStabilityThreshold, marketTrend, setMarketTrend,
        colorPatternProfiles, setColorPatternProfiles,
        overUnderPatternProfiles, setOverUnderPatternProfiles,
        martingaleMode, setMartingaleMode, martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels, takeProfit, setTakeProfit, stopLoss, setStopLoss,
        targetProfitPerTrade, setTargetProfitPerTrade,
        isBotRunning, setIsBotRunning, isManualMode, setIsManualMode, isManualGaleActive, setIsManualGaleActive, manualGaleLevel, setManualGaleLevel,
        currentSignal, setCurrentSignal, currentSignalDetails,
        matchedPatternInfo, setMatchedPatternInfo,
        totalProfit, setTotalProfit, peakProfit, setPeakProfit, wins, setWins, losses, setLosses, totalTradesMade, setTotalTradesMade,
        lastDigits, setLastDigits,
        lastTickEpoch, setLastTickEpoch, logs, setLogs,
        signals, percentages, setPercentages, chartData, setChartData, profiles, setProfiles, accountBalance, setAccountBalance,
        activeContract, setActiveContract, tradeStatus, setTradeStatus,
        catalogAnalysisWindow, setCatalogAnalysisWindow, addLog, clearLogs, addSignal, clearSignals, updateSignalResult,
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
        lastLosingContractType, setLastLosingContractType,
        lastLosingBarrier, setLastLosingBarrier,
        surferAnalysisWindow, setSurferAnalysisWindow,
        surferTriggerPercentage, setSurferTriggerPercentage,
        surferMartingaleDirection, setSurferMartingaleDirection,
        isUserDisconnected, setIsUserDisconnected,
        lastSurferWinResult, setLastSurferWinResult,
        isDoubleOneTriggerActive, setIsDoubleOneTriggerActive,
        doubleOneTriggerCount, setDoubleOneTriggerCount,
        doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits,
        maxTrades, setMaxTrades,
        isSorosActive, setIsSorosActive,
        sorosLevels, setSorosLevels,
        sorosProfitPercentage, setSorosProfitPercentage,
        sorosLevel, setSorosLevel,
        lastTradeProfit, setLastTradeProfit,
        isMartingaleActive, setIsMartingaleActive,
        virtualLossStreak, setVirtualLossStreak,
        virtualWinStreak, setVirtualWinStreak,
        isWaitingForVirtualResult, setIsWaitingForVirtualResult,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
        // EXPORTANDO NOVOS ESTADOS INOVADORES
        isManualSniperMode, setIsManualSniperMode,
        marketPulse, setMarketPulse,
        maxMarketSpeed, setMaxMarketSpeed,
    };
};