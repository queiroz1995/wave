"use client";

import { useEffect } from 'react';
import { useBotState } from './useBotState';

export const useBotPersistence = (state: ReturnType<typeof useBotState>) => {
    const {
        realToken, demoToken, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        
        // Banca Separada
        realInitialBankroll, demoInitialBankroll,
        realDailyGoalPercent, demoDailyGoalPercent,
        realDailyStopPercent, demoDailyStopPercent,
        realCurrentDay, demoCurrentDay,
        realActualBankroll, demoActualBankroll,
        realBankHistory, demoBankHistory,
        
        // Resultados Separados
        realTotalProfit, demoTotalProfit,
        realWins, demoWins,
        realLosses, demoLosses,
        realSignals, demoSignals,

        autoSequenceActive, autoSequenceTrigger, autoSequenceEntry
    } = state;
    
    useEffect(() => {
        const stateToSave = {
            realToken, demoToken, accountType, asset, duration, initialStake,
            digitTradeMode, attackMode, digitPrediction, overUnderDirection,
            martingaleFactor, maxLevels, takeProfit, stopLoss,
            isMartingaleActive, analyzerWindowSize, isManualMode,
            learningData, scoreThreshold, marketStabilityThreshold,
            
            // Banca Separada
            realInitialBankroll, demoInitialBankroll,
            realDailyGoalPercent, demoDailyGoalPercent,
            realDailyStopPercent, demoDailyStopPercent,
            realCurrentDay, demoCurrentDay,
            realActualBankroll, demoActualBankroll,
            realBankHistory, demoBankHistory,
            
            // Resultados Separados
            realTotalProfit, demoTotalProfit,
            realWins, demoWins,
            realLosses, demoLosses,
            realSignals, demoSignals,

            autoSequenceActive, autoSequenceTrigger, autoSequenceEntry
        };
        localStorage.setItem('derivBotState', JSON.stringify(stateToSave));
    }, [
        realToken, demoToken, accountType, asset, duration, initialStake,
        digitTradeMode, attackMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold,
        
        // Banca Separada
        realInitialBankroll, demoInitialBankroll,
        realDailyGoalPercent, demoDailyGoalPercent,
        realDailyStopPercent, demoDailyStopPercent,
        realCurrentDay, demoCurrentDay,
        realActualBankroll, demoActualBankroll,
        realBankHistory, demoBankHistory,
        
        // Resultados Separados
        realTotalProfit, demoTotalProfit,
        realWins, demoWins,
        realLosses, demoLosses,
        realSignals, demoSignals,

        autoSequenceActive, autoSequenceTrigger, autoSequenceEntry
    ]);
};