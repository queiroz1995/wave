"use client";

import { useEffect } from 'react';
import { useBotState } from './useBotState';

export const useBotPersistence = (state: ReturnType<typeof useBotState>) => {
    const {
        // Connection
        realToken, demoToken, accountType, isUserDisconnected,
        // Trade Parameters
        asset, duration, initialStake, digitTradeMode, digitPrediction, overUnderDirection,
        // Risk Management
        martingaleFactor, maxLevels, takeProfit, stopLoss, lossRecoveryStrategy,
        targetProfitPerTrade, activeStrategy, minWinRate, marketStabilityThreshold,
        colorPatternProfiles, overUnderPatternProfiles, martingaleMode,
        isMartingaleActive,
        // Strategy
        analyzerWindowSize, patternLengthForAnalysis,
        // Cataloger
        catalogerPatternLength, catalogerMinWinRate,
        catalogerMartingaleLevels, catalogerMinOccurrences,
        // Bank Management
        bankManagementInitialBankroll,
        bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent,
        bankManagementCurrentDay,
        bankManagementActualBankroll,
        // Manual Mode
        isManualMode, isManualGaleActive,
        // Double One Trigger
        isDoubleOneTriggerActive, doubleOneTriggerCount, doubleOneTriggerTargetDigits,
        // Max Trades
        maxTrades,
        // Soros
        isSorosActive, sorosLevels, sorosProfitPercentage,
        // Virtual Loss
        virtualLossStreak, isWaitingForVirtualResult, virtualTargetLosses,
        // NOVO: Filtro de Sequência
        isStreakFilterActive, maxStreakAllowed,
    } = state;
    
    useEffect(() => {
        const stateToSave = {
            realToken, demoToken, accountType, isUserDisconnected,
            asset, duration, initialStake, digitTradeMode, digitPrediction,
            overUnderDirection,
            martingaleFactor, maxLevels, takeProfit, stopLoss, lossRecoveryStrategy,
            targetProfitPerTrade,  activeStrategy, minWinRate, marketStabilityThreshold,
            colorPatternProfiles, overUnderPatternProfiles, martingaleMode,
            isMartingaleActive,
            analyzerWindowSize, patternLengthForAnalysis,
            catalogerPatternLength, catalogerMinWinRate,
            catalogerMartingaleLevels, catalogerMinOccurrences,
            bankManagementInitialBankroll,
            bankManagementDailyGoalPercent,
            bankManagementDailyStopPercent,
            bankManagementCurrentDay,
            bankManagementActualBankroll,
            isManualMode, isManualGaleActive,
            isDoubleOneTriggerActive,
            doubleOneTriggerCount,
            doubleOneTriggerTargetDigits,
            maxTrades,
            isSorosActive,
            sorosLevels,
            sorosProfitPercentage,
            virtualLossStreak,
            isWaitingForVirtualResult,
            virtualTargetLosses,
            isStreakFilterActive,
            maxStreakAllowed,
        };

        localStorage.setItem('derivBotState', JSON.stringify(stateToSave));
    }, [
         realToken, demoToken, accountType, isUserDisconnected,
        asset, duration, initialStake, digitTradeMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss, lossRecoveryStrategy,
        targetProfitPerTrade,  activeStrategy, minWinRate, marketStabilityThreshold,
        colorPatternProfiles, overUnderPatternProfiles, martingaleMode,
        isMartingaleActive,
        analyzerWindowSize, patternLengthForAnalysis,
        catalogerPatternLength, catalogerMinWinRate,
        catalogerMartingaleLevels, catalogerMinOccurrences,
        bankManagementInitialBankroll,
        bankManagementDailyGoalPercent,
        bankManagementDailyStopPercent,
        bankManagementCurrentDay,
        bankManagementActualBankroll,
        isManualMode, isManualGaleActive,
        isDoubleOneTriggerActive,
        doubleOneTriggerCount,
        doubleOneTriggerTargetDigits,
        maxTrades,
        isSorosActive,
        sorosLevels,
        sorosProfitPercentage,
        virtualLossStreak,
        isWaitingForVirtualResult,
        virtualTargetLosses,
        isStreakFilterActive,
        maxStreakAllowed,
    ]);
};