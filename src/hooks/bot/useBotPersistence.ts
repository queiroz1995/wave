"use client";

import { useEffect } from 'react';
import { useBotState } from './useBotState';

export const useBotPersistence = (state: ReturnType<typeof useBotState>) => {
    const {
        realToken, demoToken, accountId, appId, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, bankManagementCurrentDay,
        bankManagementActualBankroll, isSmartModeActive, virtualTargetLosses
    } = state;
    
    useEffect(() => {
        const stateToSave = {
            realToken, demoToken, accountId, appId, accountType, asset, duration, initialStake,
            digitTradeMode, attackMode, digitPrediction, overUnderDirection,
            martingaleFactor, maxLevels, takeProfit, stopLoss,
            isMartingaleActive, analyzerWindowSize, isManualMode,
            learningData, scoreThreshold, marketStabilityThreshold,
            bankManagementInitialBankroll, bankManagementDailyGoalPercent,
            bankManagementDailyStopPercent, bankManagementCurrentDay,
            bankManagementActualBankroll, isSmartModeActive, virtualTargetLosses
        };
        localStorage.setItem('derivBotState', JSON.stringify(stateToSave));
    }, [
        realToken, demoToken, accountId, appId, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, bankManagementCurrentDay,
        bankManagementActualBankroll, isSmartModeActive, virtualTargetLosses
    ]);
};