"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VirtualLossDisplay = () => {
    const { virtualLossStreak, virtualTargetLosses, isWaitingForVirtualResult, isBotRunning } = useBotContext();

    if (!isBotRunning) return null;

    const percentage = (virtualLossStreak / virtualTargetLosses) * 100;

    return (
        <Card className="bg-primary/5 border-primary/20 mb-4 overflow-hidden">
            <CardContent className="p-3">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className={cn("h-4 w-4", virtualLossStreak > 0 ? "text-yellow-500 animate-pulse" : "text-muted-foreground")} />
                        <span className="text-xs font-bold uppercase tracking-wider">Modo Filtro: Loss Virtual</span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-primary/20 px-2 py-0.5 rounded">
                        {virtualLossStreak} / {virtualTargetLosses}
                    </span>
                </div>
                
                <Progress value={percentage} className="h-1.5 mb-2" />
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground italic">
                    <span>Aguardando {virtualTargetLosses} derrotas simuladas</span>
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