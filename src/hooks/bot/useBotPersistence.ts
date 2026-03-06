"use client";

import { useEffect } from 'react';
import { useBotState } from './useBotState';

export const useBotPersistence = (state: ReturnType<typeof useBotState>) => {
    const {
        realToken, demoToken, accountType, asset, duration, initialStake,
        digitTradeMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold
    } = state;
    
    useEffect(() => {
        const stateToSave = {
            realToken, demoToken, accountType, asset, duration, initialStake,
            digitTradeMode, digitPrediction, overUnderDirection,
            martingaleFactor, maxLevels, takeProfit, stopLoss,
            isMartingaleActive, analyzerWindowSize, isManualMode,
            learningData, scoreThreshold, marketStabilityThreshold
        };
        localStorage.setItem('derivBotState', JSON.stringify(stateToSave));
    }, [
        realToken, demoToken, accountType, asset, duration, initialStake,
        digitTradeMode, digitPrediction, overUnderDirection,
        martingaleFactor, maxLevels, takeProfit, stopLoss,
        isMartingaleActive, analyzerWindowSize, isManualMode,
        learningData, scoreThreshold, marketStabilityThreshold
    ]);
};