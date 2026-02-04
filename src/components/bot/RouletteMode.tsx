"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, History, Plus, Minus, Globe, BarChart3 } from 'lucide-react';

export const RouletteMode = () => {
    const { 
        rouletteTimer, isRouletteSpinning, rouletteHistory, 
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        lastSelectedRouletteNumbers, lastDigits,
        initialStake, setInitialStake, isConnected 
    } = useBotContext();

    const isBettingOpen = rouletteTimer > 4;
    const progress = (rouletteTimer / 16) * 100;

    // Estatísticas baseadas nas 100 rodadas (ou nos últimos ticks se estiver vazio)
    const stats = useMemo(() => {
        const data = rouletteHistory.length > 0 ? rouletteHistory : lastDigits.slice(0, 100);
        const counts = Array(10).fill(0);
        data.forEach((d: number) => counts[d]++);
        const total = data.length || 1;
        return counts.map(c => Math.round((c / total) * 100));
    }, [lastDigits, rouletteHistory]);

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
        <Card className="bg-card/80 backdrop-blur-sm overflow-hidden border-primary/20">
            <CardContent className="p-6 space-y-6">
                
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <Globe className="h-3 w-3 text-green-500" />
                        <span className="text-[10px] font-bold text-green-500 uppercase">Analise Real (Últimas 100 Rodadas)</span>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
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

                {/* Grelha 0-9 com Estatísticas Reais */}
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

                {/* Histórico Completo (100 Rodadas) */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                            <History className="h-3 w-3" /> Histórico (100 Rodadas)
                        </span>
                        <span className="text-[9px] font-bold text-primary">Total: {rouletteHistory.length}</span>
                    </div>
                    
                    {/* Container Rolável com Grid */}
                    <div className="bg-muted/20 rounded-lg p-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-10 gap-1.5">
                            {isRouletteSpinning && (
                                <div className="aspect-square rounded-md bg-primary/20 flex items-center justify-center animate-spin">
                                    <Zap className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            {rouletteHistory.map((digit, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "aspect-square rounded-md flex items-center justify-center text-xs font-black text-white",
                                        getDigitColor(digit)
                                    )}
                                >
                                    {digit}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    {!isConnected ? (
                        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-[10px] text-yellow-500 font-bold uppercase">Simulação: Dados Reais</p>
                            <p className="text-[9px] text-muted-foreground mt-1">Conecte o Token para apostar automaticamente nestes números.</p>
                        </div>
                    ) : (
                        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-[10px] text-green-500 font-bold uppercase">Monitorando Apostas Reais</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};