"use client";

import React, { useState, useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, Zap, Target, ShieldCheck, Eye, EyeOff, AlertTriangle, CheckCircle2, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkLossDigitHigh } from '@/utils/virtualLossHelper';

export const VirtualLossDisplay = () => {
    const { 
        virtualLossStreak, virtualTargetLosses, 
        isBotRunning, isWaitingForRecoveryVirtual,
        lastDigits, digitTradeMode, digitPrediction, overUnderDirection,
        isLossDigitFilterActive, maxLossDigitPercent
    } = useBotContext();

    const [isHidden, setIsHidden] = useState<boolean>(() => {
        return localStorage.getItem('panel_hide_virtual_loss') === 'true';
    });

    const toggleHidden = (hidden: boolean) => {
        setIsHidden(hidden);
        localStorage.setItem('panel_hide_virtual_loss', String(hidden));
    };

    const threshold = Number(maxLossDigitPercent) || 18;

    // Cálculo das estatísticas dos dígitos 0 a 9 e filtro de dígitos de perda
    const digitAnalysis = useMemo(() => {
        return checkLossDigitHigh(
            lastDigits,
            digitTradeMode,
            Number(digitPrediction) || 4,
            overUnderDirection,
            threshold,
            undefined,
            50
        );
    }, [lastDigits, digitTradeMode, digitPrediction, overUnderDirection, threshold]);

    if (!isBotRunning) return null;

    const showVirtualFilter = virtualTargetLosses > 0;
    const showRecoveryFilter = isWaitingForRecoveryVirtual;

    const percentage = showRecoveryFilter 
        ? 50 
        : virtualTargetLosses > 0 ? (virtualLossStreak / virtualTargetLosses) * 100 : 100;

    const Icon = showRecoveryFilter ? ShieldCheck : Target;
    const iconColor = showRecoveryFilter ? "text-rose-400" : "text-cyan-400";
    const phaseLabel = showRecoveryFilter ? "Protocolo de Segurança Ativo" : "Mapeando Oportunidades & Dígitos";
    
    if (isHidden) {
        return (
            <div className="mb-3 flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", iconColor)} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">{phaseLabel}</span>
                    {digitAnalysis.isHigh && (
                        <span className="text-[9px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3 animate-pulse" /> Loss Alto
                        </span>
                    )}
                </div>
                <button
                    onClick={() => toggleHidden(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Mostrar Filtro Virtual & Porcentagem 0-9"
                >
                    <EyeOff className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <Card className={cn(
            "mb-3 overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-md",
            digitAnalysis.isHigh 
                ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]" 
                : showRecoveryFilter 
                    ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "bg-slate-900/70 border-white/10 shadow-lg"
        )}>
            <CardContent className="p-3.5 space-y-2.5">
                {/* Header Superior: Mapeamento + VLoss Streak */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4 animate-pulse", iconColor)} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", showRecoveryFilter ? "text-rose-400" : "text-cyan-400")}>
                            {phaseLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {showVirtualFilter && (
                            <span className={cn(
                                "text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border",
                                showRecoveryFilter ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                            )}>
                                {showRecoveryFilter ? "AGUARDANDO LOSS VIRTUAL" : `LOSS VIRTUAL: ${virtualLossStreak}/${virtualTargetLosses}`}
                            </span>
                        )}
                        <button
                            onClick={() => toggleHidden(true)}
                            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Ocultar Painel"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {/* Barra de Progresso do Loss Virtual (se ativo) */}
                {showVirtualFilter && (
                    <Progress 
                        value={percentage} 
                        className={cn("h-1.5 bg-slate-950", showRecoveryFilter ? "[&>div]:bg-rose-500" : "[&>div]:bg-cyan-400")} 
                    />
                )}

                {/* PAINEL DE DIGITOS 0 A 9 & PORCENTAGENS */}
                <div className="pt-1 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <Percent className="w-3 h-3 text-cyan-400" />
                            Porcentagem dos Dígitos (0 a 9)
                        </span>
                        <span className="text-[8px] text-slate-500">Amostra: 50 ticks</span>
                    </div>

                    {/* Grade de 0 a 9 com Destaque para Dígitos de Perda */}
                    <div className="grid grid-cols-10 gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-white/5">
                        {digitAnalysis.stats.map(({ digit, percentage, isLossDigit }) => {
                            const isHighLoss = isLossDigit && percentage >= threshold;

                            return (
                                <div 
                                    key={digit} 
                                    className={cn(
                                        "flex flex-col items-center justify-between py-1 px-0.5 rounded-lg border transition-all text-center",
                                        isHighLoss 
                                            ? "bg-rose-500/25 border-rose-500/80 text-rose-300 font-black animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]" 
                                            : isLossDigit 
                                                ? "bg-rose-950/30 border-rose-500/30 text-rose-400" 
                                                : "bg-slate-900/50 border-white/5 text-slate-300"
                                    )}
                                    title={`Dígito ${digit}: ${percentage.toFixed(1)}% ${isLossDigit ? '(Dígito de Perda)' : ''}`}
                                >
                                    <span className="text-[9px] font-black leading-tight">
                                        {digit}
                                    </span>

                                    {/* Mini Barra Percentual */}
                                    <div className="w-full bg-slate-950 h-1.5 rounded-full my-0.5 overflow-hidden">
                                        <div 
                                            className={cn(
                                                "h-full rounded-full transition-all duration-300",
                                                isHighLoss 
                                                    ? "bg-rose-500" 
                                                    : isLossDigit 
                                                        ? "bg-rose-400/70" 
                                                        : "bg-cyan-400"
                                            )}
                                            style={{ width: `${Math.min(100, percentage * 2)}%` }}
                                        />
                                    </div>

                                    <span className={cn(
                                        "text-[8px] font-bold leading-none",
                                        isHighLoss ? "text-rose-200 font-black" : "text-slate-400"
                                    )}>
                                        {percentage.toFixed(0)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Banner do Filtro de Entrada (Bloqueia se Dígito de Perda for Alto) */}
                {isLossDigitFilterActive && (
                    <div className={cn(
                        "flex items-center justify-between p-2 rounded-xl text-[9px] font-bold border transition-all",
                        digitAnalysis.isHigh 
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-300" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}>
                        <div className="flex items-center gap-1.5">
                            {digitAnalysis.isHigh ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>
                                {digitAnalysis.isHigh 
                                    ? `ALERTA: Dígito de perda [${digitAnalysis.highLossDigits.map(h => h.digit).join(', ')}] com alta porcentagem (${digitAnalysis.maxLossDigit.percentage.toFixed(1)}% ≥ ${threshold}%). Entrada BLOQUEADA!`
                                    : `Filtro Seguro: Maior dígito de perda está em ${digitAnalysis.maxLossDigit.percentage.toFixed(1)}% (Limite: ${threshold}%). Entrada LIBERADA.`
                                }
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
