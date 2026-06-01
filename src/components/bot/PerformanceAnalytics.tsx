"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { TrendingUp, Award, Percent, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PerformanceAnalytics = () => {
    const { signals } = useBotContext();

    // Calcula as estatísticas avançadas e a curva de patrimônio
    const stats = useMemo(() => {
        const finishedTrades = [...signals]
            .filter((s: any) => typeof s.profit === 'number')
            .reverse(); // Ordem cronológica

        let currentEquity = 0;
        const equityCurve = [0];
        let maxWinStreak = 0;
        let currentWinStreak = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;

        finishedTrades.forEach((trade: any) => {
            const profit = trade.profit || 0;
            currentEquity += profit;
            equityCurve.push(currentEquity);

            if (trade.result === 'WIN') {
                currentWinStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                totalWinAmount += profit;
            } else {
                currentWinStreak = 0;
                totalLossAmount += Math.abs(profit);
            }
        });

        const totalTrades = finishedTrades.length;
        const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount) : totalWinAmount;
        const avgProfit = totalTrades > 0 ? (currentEquity / totalTrades) : 0;

        return {
            equityCurve,
            maxWinStreak,
            profitFactor,
            avgProfit,
            totalTrades
        };
    }, [signals]);

    // Desenha o gráfico SVG da curva de patrimônio
    const svgPath = useMemo(() => {
        const data = stats.equityCurve;
        if (data.length < 2) return { line: '', area: '' };

        const width = 300;
        const height = 60;
        const padding = 5;

        const minVal = Math.min(...data, 0);
        const maxVal = Math.max(...data, 1);
        const valRange = maxVal - minVal;

        const points = data.map((val, index) => {
            const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((val - minVal) / valRange) * (height - padding * 2) - padding;
            return { x, y };
        });

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

        return { line: linePath, area: areaPath };
    }, [stats.equityCurve]);

    if (stats.totalTrades === 0) return null;

    return (
        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-1.5 px-1">
                <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análise de Performance</span>
            </div>

            {/* Gráfico de Curva de Patrimônio */}
            <div className="relative h-16 bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden flex items-end">
                <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Área preenchida */}
                    {svgPath.area && (
                        <path d={svgPath.area} fill="url(#equityGradient)" />
                    )}
                    {/* Linha do gráfico */}
                    {svgPath.line && (
                        <path d={svgPath.line} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </svg>
                <div className="absolute top-2 left-3 text-[7px] font-bold text-slate-500 uppercase tracking-wider">Curva de Patrimônio</div>
            </div>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Fator de Lucro</p>
                    <p className={cn(
                        "text-xs font-black",
                        stats.profitFactor >= 1.5 ? "text-emerald-400" : stats.profitFactor >= 1.0 ? "text-cyan-400" : "text-rose-400"
                    )}>
                        {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    </p>
                </div>
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Seq. Vitórias</p>
                    <p className="text-xs font-black text-white flex items-center justify-center gap-0.5">
                        <Award className="h-3 w-3 text-amber-400" /> {stats.maxWinStreak}x
                    </p>
                </div>
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Média / Trade</p>
                    <p className={cn(
                        "text-xs font-black",
                        stats.avgProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                        ${stats.avgProfit.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
};