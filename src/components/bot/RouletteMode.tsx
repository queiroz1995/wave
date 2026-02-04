"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Minus, History, Activity } from 'lucide-react';

export const RouletteMode = () => {
    const { 
        rouletteTimer, isRouletteSpinning, rouletteHistory, 
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        lastDigits, initialStake, setInitialStake, isConnected,
        totalProfit
    } = useBotContext();

    const isBettingOpen = rouletteTimer > 4;
    const progress = (rouletteTimer / 16) * 100;

    // Estatísticas para os botões da roleta
    const stats = useMemo(() => {
        const data = rouletteHistory.length > 0 ? rouletteHistory : lastDigits.slice(0, 50);
        const counts = Array(10).fill(0);
        data.forEach((d: number) => counts[d]++);
        const total = data.length || 1;
        return counts.map(c => Math.round((c / total) * 100));
    }, [lastDigits, rouletteHistory]);

    // Grade de 16 números (Ticks em tempo real - ONDE ERA)
    const last16Ticks = useMemo(() => lastDigits.slice(0, 16), [lastDigits]);

    const toggleNumber = (num: number) => {
        if (!isBettingOpen) return;
        setSelectedRouletteNumbers((prev: number[]) => 
            prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
        );
    };

    const adjustStake = (amount: number) => {
        const current = parseFloat(initialStake) || 0;
        const next = Math.max(0.35, current + amount);
        setInitialStake(next.toFixed(2));
    };

    const getDigitColor = (digit: number) => {
        if (digit === 0) return "bg-blue-600";
        if (digit % 2 === 0) return "bg-emerald-600";
        return "bg-rose-600";
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm overflow-hidden border-primary/20 h-full">
            <CardContent className="p-6 space-y-6">
                
                {/* CABEÇALHO DE STATUS (LUCRO E RITMO) */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Mercado em Tempo Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground">LUCRO:</span>
                        <span className={cn('text-xs font-black', totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                            ${totalProfit.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* A GRADE DE NÚMEROS (ONDE ERA) */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <History className="h-3 w-3" /> Tendência (Últimos 16 Ticks)
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                        {last16Ticks.map((digit: number, i: number) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "h-7 flex items-center justify-center text-[11px] font-black text-white rounded-[4px] shadow-sm transition-all",
                                    getDigitColor(digit),
                                    i === 0 && "ring-2 ring-primary ring-offset-1 scale-105 z-10"
                                )}
                            >
                                {digit}
                            </div>
                        ))}
                        {last16Ticks.length === 0 && (
                            <div className="col-span-8 h-7 bg-muted/20 rounded-[4px] animate-pulse" />
                        )}
                    </div>
                </div>

                {/* CRONÔMETRO DA ROLETA */}
                <div className="flex flex-col items-center justify-center space-y-4 pt-2 border-t border-white/5">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                            <circle 
                                cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" 
                                strokeDasharray="377" 
                                strokeDashoffset={377 - (377 * progress) / 100}
                                className={cn("transition-all duration-1000 ease-linear", isBettingOpen ? "text-primary" : "text-yellow-500")}
                            />
                        </svg>
                        <div className="text-center">
                            <p className="text-4xl font-black">{rouletteTimer}s</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {isBettingOpen ? "Apostas" : "Sorteando"}
                            </p>
                        </div>
                    </div>
                    <Badge variant={isBettingOpen ? "default" : "secondary"} className="px-4 py-1 uppercase font-bold">
                        {isBettingOpen ? "Apostas Abertas" : "Girando Roleta"}
                    </Badge>
                </div>

                {/* CONTROLE DE STAKE */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(-0.5)}><Minus className="h-4 w-4" /></Button>
                        <div className="flex-1 text-center bg-muted/30 rounded-md py-1 border border-white/5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Stake por Número</p>
                            <p className="text-xl font-black">${initialStake}</p>
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(0.5)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>

                {/* TECLADO DA ROLETA */}
                <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => toggleNumber(num)}
                            disabled={!isBettingOpen}
                            className={cn(
                                "h-16 rounded-xl flex flex-col items-center justify-center transition-all border-2",
                                selectedRouletteNumbers.includes(num) 
                                    ? "border-primary bg-primary/20" 
                                    : "border-white/5 bg-muted/30",
                                !isBettingOpen && "opacity-50"
                            )}
                        >
                            <span className={cn("w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold text-white mb-1", getDigitColor(num))}>
                                {num}
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground">{stats[num]}%</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};