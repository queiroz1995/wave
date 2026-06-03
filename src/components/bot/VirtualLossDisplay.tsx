"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, Zap, Trophy, Target, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VirtualLossDisplay = () => {
    const { 
        virtualLossStreak, virtualTargetLosses, 
        virtualWinStreak, virtualTargetWins,
        isWaitingForVirtualResult, isBotRunning,
        isWaitingForRecoveryVirtual
    } = useBotContext();

    if (!isBotRunning) return null;
    
    const showInitialFilter = virtualTargetLosses > 0 && virtualLossStreak < virtualTargetLosses;
    const showRecoveryFilter = isWaitingForRecoveryVirtual;

    if (!showInitialFilter && !showRecoveryFilter) return null;

    const percentage = showRecoveryFilter 
        ? 50 // Valor fixo para indicar que está esperando 1 loss
        : (virtualLossStreak / virtualTargetLosses) * 100;

    const Icon = showRecoveryFilter ? ShieldCheck : Target;
    const iconColor = showRecoveryFilter ? "text-red-500" : "text-blue-500";
    const phaseLabel = showRecoveryFilter ? "Protocolo de Segurança Ativo" : "Mapeando Oportunidade";
    
    return (
        <Card className={cn(
            "mb-4 overflow-hidden rounded-2xl border-2 transition-all duration-500",
            showRecoveryFilter ? "bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-primary/5 border-primary/20"
        )}>
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4 animate-pulse", iconColor)} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", showRecoveryFilter ? "text-red-600" : "text-primary")}>
                            {phaseLabel}
                        </span>
                    </div>
                    <span className={cn(
                        "text-[10px] font-mono font-black px-3 py-1 rounded-full",
                        showRecoveryFilter ? "bg-red-500/20 text-red-600" : "bg-primary/10 text-primary"
                    )}>
                        {showRecoveryFilter ? "AGUARDANDO LOSS VIRTUAL" : `${virtualLossStreak} / ${virtualTargetLosses}`}
                    </span>
                </div>
                
                <Progress 
                    value={percentage} 
                    className={cn("h-1.5 mb-2", showRecoveryFilter && "[&>div]:bg-red-500")} 
                />
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground italic font-medium">
                    <span>
                        {showRecoveryFilter 
                            ? "Aguardando 1 Loss Virtual para confirmar reversão de ciclo..." 
                            : `Buscando ${virtualTargetLosses} anomalias de mercado...`}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-black animate-pulse">
                        <Zap className="h-3 w-3 fill-current" /> Sincronizando...
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};