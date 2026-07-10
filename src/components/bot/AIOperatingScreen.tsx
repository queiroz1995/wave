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
        if (digits.length < 20) {
            return {
                recommendation: "AGUARDAR",
                confidence: 0,
                evenPercent: 50,
                oddPercent: 50,
                reason: "Coletando amostras (Aguarde 20+ ticks)..."
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

        const sampleRSI = digits.slice(0, 14);
        const evensRSI = sampleRSI.filter((digit) => digit % 2 === 0).length;
        const evenPercent = Math.round((evensRSI / 14) * 100);
        const oddPercent = 100 - evenPercent;

        let recommendation = "AGUARDAR";
        let confidence = 0;
        let reason = "Zona de ruído estatístico. Aguardando confluências...";

        // Análise de Confluência Neural para o App
        if (currentParity === 'EVEN') {
            if (currentStreak >= maxEven60 && maxEven60 > 2) {
                recommendation = "ÍMPAR";
                confidence = 98;
                reason = `Aviso de Colapso (60T): Sequência PAR (${currentStreak}x) excedeu o teto de ${maxEven60}x. Reversão massiva.`;
            } else if (currentStreak >= maxEven30 && evenPercent > 70) {
                recommendation = "ÍMPAR";
                confidence = 92;
                reason = `Confluência Dupla (30T): Exaustão (${currentStreak}x) alinhada com RSI sobrecomprado (${evenPercent}% PAR).`;
            } else if (currentStreak >= maxEven30) {
                recommendation = "ÍMPAR";
                confidence = 85;
                reason = `Exaustão Básica (30T): Sequência PAR atingiu ${currentStreak}x.`;
            } else if (evenPercent >= 78 && currentStreak < 2) {
                recommendation = "PAR"; // Trend following
                confidence = 82;
                reason = `Trend Following Neural: Momentum esmagador de PAR (${evenPercent}%). Rompendo a favor da força.`;
            }
        } else {
            if (currentStreak >= maxOdd60 && maxOdd60 > 2) {
                recommendation = "PAR";
                confidence = 98;
                reason = `Aviso de Colapso (60T): Sequência ÍMPAR (${currentStreak}x) excedeu o teto de ${maxOdd60}x. Reversão massiva.`;
            } else if (currentStreak >= maxOdd30 && oddPercent > 70) {
                recommendation = "PAR";
                confidence = 92;
                reason = `Confluência Dupla (30T): Exaustão (${currentStreak}x) alinhada com RSI sobrecomprado (${oddPercent}% ÍMPAR).`;
            } else if (currentStreak >= maxOdd30) {
                recommendation = "PAR";
                confidence = 85;
                reason = `Exaustão Básica (30T): Sequência ÍMPAR atingiu ${currentStreak}x.`;
            } else if (oddPercent >= 78 && currentStreak < 2) {
                recommendation = "ÍMPAR"; // Trend following
                confidence = 82;
                reason = `Trend Following Neural: Momentum esmagador de ÍMPAR (${oddPercent}%). Rompendo a favor da força.`;
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