"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { ShieldCheck, AlertTriangle, TrendingUp, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OperationDiagnostic = () => {
    const { 
        totalProfit, wins, losses, initialStake, 
        accountBalance, takeProfit, stopLoss, isBotRunning 
    } = useBotContext();

    const diagnostic = useMemo(() => {
        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const stakeNum = parseFloat(initialStake) || 0;
        const balanceNum = accountBalance || 0;
        const tpNum = parseFloat(takeProfit) || 0;
        
        // Análise de Risco
        let riskLevel = "Baixo";
        let riskColor = "text-green-500";
        let riskIcon = <ShieldCheck className="h-4 w-4" />;
        
        if (balanceNum > 0) {
            const riskPercent = (stakeNum / balanceNum) * 100;
            if (riskPercent > 5) {
                riskLevel = "Crítico";
                riskColor = "text-red-500";
                riskIcon = <AlertTriangle className="h-4 w-4" />;
            } else if (riskPercent > 2) {
                riskLevel = "Moderado";
                riskColor = "text-orange-500";
                riskIcon = <AlertTriangle className="h-4 w-4" />;
            }
        }

        // Mensagem de Performance
        let performanceMsg = "Aguardando dados...";
        let performanceColor = "text-muted-foreground";

        if (totalTrades > 0) {
            if (totalProfit > 0) {
                performanceMsg = totalProfit >= tpNum * 0.8 
                    ? "Meta quase batida! Cuidado com a ganância." 
                    : "Sessão lucrativa. Mantenha o plano.";
                performanceColor = "text-green-600";
            } else if (totalProfit < 0) {
                performanceMsg = "Sequência negativa. Avalie parar cedo.";
                performanceColor = "text-red-500";
            } else {
                performanceMsg = "Equilíbrio de mercado detectado.";
                performanceColor = "text-blue-500";
            }
        }

        return { winRate, riskLevel, riskColor, riskIcon, performanceMsg, performanceColor };
    }, [wins, losses, totalProfit, initialStake, accountBalance, takeProfit]);

    if (!isBotRunning && totalProfit === 0) return null;

    return (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-5 shadow-sm space-y-4 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Diagnóstico I.A</span>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border text-[9px] font-black uppercase", diagnostic.riskColor)}>
                    {diagnostic.riskIcon}
                    Risco {diagnostic.riskLevel}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Assertividade</p>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="text-lg font-black">{diagnostic.winRate.toFixed(1)}%</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Progresso Meta</p>
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        <p className="text-lg font-black">
                            {takeProfit > 0 ? ((totalProfit / parseFloat(takeProfit)) * 100).toFixed(0) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            <div className={cn("p-3 rounded-2xl bg-white/50 border border-white text-[10px] font-bold italic text-center", diagnostic.performanceColor)}>
                "{diagnostic.performanceMsg}"
            </div>
        </div>
    );
};