"use client";

import { useEffect } from 'react';
import { useBotState } from './useBotState';

export const useBotPersistence = (state: ReturnType<typeof useBotState>) => {
    const {
        realToken, demoToken, accountId, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, bankManagementCurrentDay,
        bankManagementActualBankroll
    } = state;
    
    useEffect(() => {
        const stateToSave = {
            realToken, demoToken, accountId, accountType, asset, duration, initialStake,
            digitTradeMode, attackMode, digitPrediction, overUnderDirection,
            martingaleFactor, maxLevels, takeProfit, stopLoss,
            isMartingaleActive, analyzerWindowSize, isManualMode,
            learningData, scoreThreshold, marketStabilityThreshold,
            bankManagementInitialBankroll, bankManagementDailyGoalPercent,
            bankManagementDailyStopPercent, bankManagementCurrentDay,
            bankManagementActualBankroll
        };
        localStorage.setItem('derivBotState', JSON.stringify(stateToSave));
    }, [
        realToken, demoToken, accountId, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        bankManagementInitialBankroll, bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, bankManagementCurrentDay,
        bankManagementActualBankroll
    ]);
};
