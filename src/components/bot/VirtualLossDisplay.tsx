"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, Zap, Trophy, Target } from 'lucide-react';
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

    const Icon = isLossPhase ? Target : Zap;
    const iconColor = isLossPhase ? "text-blue-500" : "text-yellow-500";
    const phaseLabel = isLossPhase ? "Mapeando Oportunidade" : "Gatilho de Confirmação";
    const streakText = isLossPhase 
        ? `${virtualLossStreak} / ${virtualTargetLosses}`
        : `${virtualWinStreak} / ${virtualTargetWins}`;

    return (
        <Card className="bg-primary/5 border-primary/20 mb-4 overflow-hidden rounded-2xl">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", (virtualLossStreak > 0 || virtualWinStreak > 0) ? `${iconColor} animate-pulse` : "text-muted-foreground")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{phaseLabel}</span>
                    </div>
                    <span className="text-[10px] font-mono font-black bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {streakText}
                    </span>
                </div>
                
                <Progress value={percentage} className={cn("h-1.5 mb-2", isWinPhase && "[&>div]:bg-yellow-500")} />
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground italic font-medium">
                    <span>
                        {isLossPhase 
                            ? `Buscando ${virtualTargetLosses} anomalias de mercado...` 
                            : `Aguardando sinal verde final para entrada de 12x...`}
                    </span>
                    {isWaitingForVirtualResult && (
                        <span className="flex items-center gap-1 text-primary font-black animate-pulse">
                            <Zap className="h-3 w-3 fill-current" /> Sincronizando Ticks...
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};