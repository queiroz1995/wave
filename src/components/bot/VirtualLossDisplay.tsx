"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, Zap, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VirtualLossDisplay = () => {
    const { 
        virtualLossStreak, virtualTargetLosses, 
        virtualWinStreak, virtualTargetWins,
        isWaitingForVirtualResult, isBotRunning 
    } = useBotContext();

    if (!isBotRunning) return null;
    if (virtualTargetLosses === 0 && virtualTargetWins === 0) return null;

    const isLossPhase = virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses;
    const isWinPhase = !isLossPhase && virtualTargetWins > 0;

    const percentage = isLossPhase 
        ? (virtualLossStreak / virtualTargetLosses) * 100
        : (virtualWinStreak / virtualTargetWins) * 100;

    const Icon = isLossPhase ? ShieldAlert : Trophy;
    const iconColor = isLossPhase ? "text-yellow-500" : "text-green-500";
    const phaseLabel = isLossPhase ? "Filtro: Loss Virtual" : "Filtro: Vitória Virtual";
    const streakText = isLossPhase 
        ? `${virtualLossStreak} / ${virtualTargetLosses}`
        : `${virtualWinStreak} / ${virtualTargetWins}`;

    return (
        <Card className="bg-primary/5 border-primary/20 mb-4 overflow-hidden">
            <CardContent className="p-3">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", (virtualLossStreak > 0 || virtualWinStreak > 0) ? `${iconColor} animate-pulse` : "text-muted-foreground")} />
                        <span className="text-xs font-bold uppercase tracking-wider">{phaseLabel}</span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-primary/20 px-2 py-0.5 rounded">
                        {streakText}
                    </span>
                </div>
                
                <Progress value={percentage} className={cn("h-1.5 mb-2", isWinPhase && "[&>div]:bg-green-500")} />
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground italic">
                    <span>
                        {isLossPhase 
                            ? `Aguardando ${virtualTargetLosses} derrotas simuladas` 
                            : `Aguardando ${virtualTargetWins} vitórias simuladas para confirmação`}
                    </span>
                    {isWaitingForVirtualResult && (
                        <span className="flex items-center gap-1 text-primary font-bold animate-pulse">
                            <Zap className="h-3 w-3" /> Analisando Próximo Dígito...
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};