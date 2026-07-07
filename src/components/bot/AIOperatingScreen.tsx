"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useBotContext } from "@/context/BotContext";
import { ContractType } from "@/types/bot";
import { QuickConfigModal } from "./QuickConfigModal";
import { RecentDigitsPanel } from "./RecentDigitsPanel";
import { AIOperatingHeroCard } from "./AIOperatingHeroCard";
import { ManualSignalPanel } from "./ManualSignalPanel";
import { AIThoughtCard } from "./AIThoughtCard";
import { OperationsFeed } from "./OperationsFeed";
import { ManualStakeDialog } from "./ManualStakeDialog";
import { VirtualLossDisplay } from "./VirtualLossDisplay";
import { AIPullAnalyzer } from "./AIPullAnalyzer";
import { Timer, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const AIOperatingScreen = () => {
    const {
        selectedAIInfo,
        totalProfit,
        accountBalance,
        isBotRunning,
        toggleBot,
        resetOperations,
        exitToSelection,
        handleConnect,
        accountType,
        isPaused,
        isManipulationDetected,
        isStudying,
        currentConfidence,
        aiThought,
        takeProfit,
        isConfigModalOpen,
        setIsConfigModalOpen,
        manualBuy,
        tradeStatus,
        isConnected,
        lastDigits,
        initialStake,
        setInitialStake,
        signals,
        stopLoss,
        currency,
        setTakeProfit,
        setStopLoss
    } = useBotContext();

    const hasTriggeredGoalConfettiRef = useRef(false);
    const [isManualStakeDialogOpen, setIsManualStakeDialogOpen] = useState(false);
    const [manualStakeValue, setManualStakeValue] = useState(initialStake);
    const [pendingContractType, setPendingContractType] = useState<ContractType | null>(null);
    
    const [showManualConfirm, setShowManualConfirm] = useState(() => {
        return localStorage.getItem("showManualConfirm") === "true";
    });

    useEffect(() => {
        localStorage.setItem("showManualConfirm", String(showManualConfirm));
    }, [showManualConfirm]);

    useEffect(() => {
        setManualStakeValue(initialStake);
    }, [initialStake]);

    useEffect(() => {
        if (totalProfit === 0) {
            hasTriggeredGoalConfettiRef.current = false;
        }
    }, [totalProfit]);

    useEffect(() => {
        const targetProfit = parseFloat(takeProfit) || 0;

        if (targetProfit > 0 && totalProfit >= targetProfit && !hasTriggeredGoalConfettiRef.current) {
            hasTriggeredGoalConfettiRef.current = true;
            const duration = 4 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 6,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: ["#22d3ee", "#34d399", "#818cf8", "#fbbf24"]
                });

                confetti({
                    particleCount: 6,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: ["#22d3ee", "#34d399", "#818cf8", "#fbbf24"]
                });

                if (Math.random() > 0.7) {
                    confetti({
                        particleCount: 15,
                        angle: 90,
                        spread: 80,
                        origin: { x: Math.random() * 0.4 + 0.3, y: 0.6 },
                        colors: ["#a78bfa", "#f472b6", "#34d399"]
                    });
                }

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();
        }
    }, [totalProfit, takeProfit]);

    const handleStartClick = () => {
        if (isBotRunning) {
            toggleBot();
        } else {
            setIsConfigModalOpen(true);
        }
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    const handleManualClick = (type: ContractType) => {
        if (!showManualConfirm) {
            manualBuy(
                type,
                type === "CALL" ? "Manual Longa" : "Manual",
                parseFloat(initialStake)
            );
            return;
        }

        setPendingContractType(type);
        setManualStakeValue(initialStake);
        setIsManualStakeDialogOpen(true);
    };

    const confirmManualBuy = () => {
        if (pendingContractType) {
            setInitialStake(manualStakeValue);

            manualBuy(
                pendingContractType,
                pendingContractType === "CALL" ? "Manual Longa" : "Manual",
                parseFloat(manualStakeValue)
            );

            setIsManualStakeDialogOpen(false);
            setPendingContractType(null);
        }
    };

    const isTradePending = tradeStatus === "SENDING" || tradeStatus === "ACTIVE";

    const manualSignalIntelligence = useMemo(() => {
        const digits = lastDigits || [];

        if (digits.length < 15) {
            return {
                recommendation: "AGUARDAR",
                confidence: 0,
                evenPercent: 50,
                oddPercent: 50,
                reason: "Sincronizando dados..."
            };
        }

        let currentStreak = 1;
        const firstIsEven = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstIsEven) {
                currentStreak++;
            } else {
                break;
            }
        }
        const currentParity = firstIsEven ? 'EVEN' : 'ODD';

        const getWindowMaxStreak = (windowDigits: number[], parity: 'EVEN' | 'ODD') => {
            let max = 0;
            let current = 0;
            const chronological = [...windowDigits].reverse();
            for (const d of chronological) {
                const isEven = d % 2 === 0;
                if ((parity === 'EVEN' && isEven) || (parity === 'ODD' && !isEven)) {
                    current++;
                    if (current > max) max = current;
                } else {
                    current = 0;
                }
            }
            return max;
        };

        const maxEven30 = getWindowMaxStreak(digits.slice(0, 30), 'EVEN');
        const maxOdd30 = getWindowMaxStreak(digits.slice(0, 30), 'ODD');
        
        const maxEven60 = getWindowMaxStreak(digits.slice(0, 60), 'EVEN');
        const maxOdd60 = getWindowMaxStreak(digits.slice(0, 60), 'ODD');
        
        const maxEven100 = getWindowMaxStreak(digits.slice(0, 100), 'EVEN');
        const maxOdd100 = getWindowMaxStreak(digits.slice(0, 100), 'ODD');

        const sample = digits.slice(0, 25);
        const evens = sample.filter((digit) => digit % 2 === 0).length;
        const evenPercent = Math.round((evens / sample.length) * 100);
        const oddPercent = 100 - evenPercent;

        let recommendation = "AGUARDAR";
        let confidence = 0;
        let reason = "Mercado equilibrado. Aguarde distorção de sequência.";

        if (currentParity === 'EVEN') {
            if (currentStreak >= maxEven100) {
                recommendation = "ÍMPAR";
                confidence = 98;
                reason = `Sequência de ${currentStreak}x PAR superou o limite histórico de ${maxEven100}x (100 ticks). Quebra iminente!`;
            } else if (currentStreak >= maxEven60) {
                recommendation = "ÍMPAR";
                confidence = 94;
                reason = `Sequência de ${currentStreak}x PAR atingiu o limite de ${maxEven60}x (60 ticks). Alta chance de quebra!`;
            } else if (currentStreak >= maxEven30) {
                recommendation = "ÍMPAR";
                confidence = 88;
                reason = `Sequência de ${currentStreak}x PAR superou o limite de ${maxEven30}x (30 ticks). Viés de quebra para ÍMPAR.`;
            } else if (currentStreak === maxEven30 - 1 && maxEven30 > 2) {
                recommendation = "ÍMPAR";
                confidence = 80;
                reason = `Sequência de ${currentStreak}x PAR está a 1 tick do limite de ${maxEven30}x (30 ticks).`;
            } else if (evenPercent >= 64) {
                recommendation = "ÍMPAR";
                confidence = Math.min(95, evenPercent + 5);
                reason = `Distorção estatística: ${evenPercent}% de PAR nos últimos 25 ticks.`;
            }
        } else {
            if (currentStreak >= maxOdd100) {
                recommendation = "PAR";
                confidence = 98;
                reason = `Sequência de ${currentStreak}x ÍMPAR superou o limite histórico de ${maxOdd100}x (100 ticks). Quebra iminente!`;
            } else if (currentStreak >= maxOdd60) {
                recommendation = "PAR";
                confidence = 94;
                reason = `Sequência de ${currentStreak}x ÍMPAR atingiu o limite de ${maxOdd60}x (60 ticks). Alta chance de quebra!`;
            } else if (currentStreak >= maxOdd30) {
                recommendation = "PAR";
                confidence = 88;
                reason = `Sequência de ${currentStreak}x ÍMPAR superou o limite de ${maxOdd30}x (30 ticks). Viés de quebra para PAR.`;
            } else if (currentStreak === maxOdd30 - 1 && maxOdd30 > 2) {
                recommendation = "PAR";
                confidence = 80;
                reason = `Sequência de ${currentStreak}x ÍMPAR está a 1 tick do limite de ${maxOdd30}x (30 ticks).`;
            } else if (oddPercent >= 64) {
                recommendation = "PAR";
                confidence = Math.min(95, oddPercent + 5);
                reason = `Distorção estatística: ${oddPercent}% de ÍMPAR nos últimos 25 ticks.`;
            }
        }

        return {
            recommendation,
            confidence,
            evenPercent,
            oddPercent,
            reason
        };
    }, [lastDigits]);

    return (
        <div className="w-full max-w-md mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-1 pb-4">
            
            <RecentDigitsPanel />

            <AIPullAnalyzer />

            <VirtualLossDisplay />

            <AIOperatingHeroCard
                selectedAIInfo={selectedAIInfo}
                totalProfit={totalProfit}
                isBotRunning={isBotRunning}
                isPaused={isPaused}
                isManipulationDetected={isManipulationDetected}
                isConnected={isConnected}
                accountType={accountType}
                accountBalance={accountBalance}
                onStartClick={handleStartClick}
                onExit={exitToSelection}
                onReconnect={handleConnect}
            >
                <ManualSignalPanel
                    showManualConfirm={showManualConfirm}
                    setShowManualConfirm={setShowManualConfirm}
                    manualSignalIntelligence={manualSignalIntelligence}
                    isConnected={isConnected}
                    isTradePending={isTradePending}
                    onManualClick={handleManualClick}
                />
            </AIOperatingHeroCard>

            {isBotRunning && <AIThoughtCard aiThought={aiThought} />}

            <OperationsFeed signals={signals} onReset={resetOperations} />

            <QuickConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onConfirm={confirmStart}
            />

            <ManualStakeDialog
                open={isManualStakeDialogOpen}
                onOpenChange={setIsManualStakeDialogOpen}
                pendingContractType={pendingContractType}
                manualStakeValue={manualStakeValue}
                setManualStakeValue={setManualStakeValue}
                onConfirm={confirmManualBuy}
                takeProfit={takeProfit}
                stopLoss={stopLoss}
                currency={currency}
                setTakeProfit={setTakeProfit}
                setStopLoss={setStopLoss}
            />
        </div>
    );
};