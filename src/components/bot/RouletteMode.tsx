"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Minus, History, Zap } from 'lucide-react';

export const RouletteMode = () => {
    const { 
        rouletteTimer, isRouletteSpinning, rouletteHistory, 
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        lastRouletteResult, initialStake, setInitialStake, isConnected 
    } = useBotContext();

    // Apostas abertas de 16 até 5 segundos
    const isBettingOpen = rouletteTimer >= 5;
    // Giro da roleta de 4 até 1 segundo
    const isSpinning = rouletteTimer <= 4 && rouletteTimer >= 1;
    // Exibição do resultado agora depende do estado lastRouletteResult
    const isShowingResult = lastRouletteResult !== null;

    const progress = (rouletteTimer / 16) * 100;

    const stats = useMemo(() => {
        const counts = Array(10).fill(0);
        rouletteHistory.forEach((d: number) => {
            if (d >= 0 && d <= 9) counts[d]++;
        });
        const total = rouletteHistory.length || 1;
        return counts.map(c => Math.round((c / total) * 100));
    }, [rouletteHistory]);

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
                
                {/* HISTÓRICO RÁPIDO */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <History className="h-3 w-3" /> Últimos Resultados
                        </p>
                    </div>
                    <div className="flex gap-2 overflow-hidden min-h-[40px] items-center">
                        {rouletteHistory.slice(0, 10).map((digit: number, i: number) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0 animate-in zoom-in duration-300",
                                    getDigitColor(digit),
                                    i === 0 && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                )}
                            >
                                {digit}
                            </div>
                        ))}
                        {rouletteHistory.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic h-8 flex items-center">Sincronizando...</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 pt-4 border-t border-white/5">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="80" cy="80" r="75" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/10" />
                            <circle 
                                cx="80" cy="80" r="75" fill="none" stroke="currentColor" strokeWidth="10" 
                                strokeDasharray="471" 
                                strokeDashoffset={471 - (471 * progress) / 100}
                                className={cn(
                                    "transition-all duration-1000 ease-linear", 
                                    isBettingOpen ? "text-primary" : "text-yellow-500"
                                )}
                            />
                        </svg>
                        
                        <div className="text-center z-10">
                            {isShowingResult ? (
                                <div className="animate-in zoom-in duration-500">
                                    <div className={cn(
                                        "w-20 h-20 rounded-full flex items-center justify-center text-5xl font-black text-white mx-auto shadow-2xl scale-110",
                                        getDigitColor(lastRouletteResult)
                                    )}>
                                        {lastRouletteResult}
                                    </div>
                                    <p className="text-[10px] font-black text-primary uppercase mt-2 animate-pulse">Sorteado!</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-5xl font-black">{rouletteTimer}s</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                                        {isSpinning ? "Girando..." : "Apostas"}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <Badge variant={isBettingOpen ? "default" : "secondary"} className="px-6 py-1.5 uppercase font-black text-xs">
                        {isSpinning ? "Sorteando Número" : isShowingResult ? "Resultado Final" : "Apostas Abertas"}
                    </Badge>
                </div>

                {/* VALOR DA APOSTA */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 border-white/10" onClick={() => adjustStake(-0.5)}><Minus className="h-5 w-5" /></Button>
                        <div className="flex-1 text-center bg-muted/30 rounded-xl py-2 border border-white/5 shadow-inner">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Entrada por Número</p>
                            <p className="text-2xl font-black">${initialStake}</p>
                        </div>
                        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 border-white/10" onClick={() => adjustStake(0.5)}><Plus className="h-5 w-5" /></Button>
                    </div>
                </div>

                {/* MESA DE APOSTAS */}
                <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => toggleNumber(num)}
                            disabled={!isBettingOpen}
                            className={cn(
                                "h-20 rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                                selectedRouletteNumbers.includes(num) 
                                    ? "border-primary bg-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                                    : "border-white/5 bg-muted/20 hover:bg-muted/40",
                                !isBettingOpen && "opacity-50 grayscale-[0.5]"
                            )}
                        >
                            <span className={cn(
                                "w-7 h-7 rounded-full text-xs flex items-center justify-center font-black text-white mb-1 shadow-md", 
                                getDigitColor(num)
                            )}>
                                {num}
                            </span>
                            <span className="text-[10px] font-black text-primary">{stats[num]}%</span>
                        </button>
                    ))}
                </div>

                <div className="text-center pt-2">
                    {!isConnected ? (
                        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-wider">Modo Treino</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Conecte sua conta para ganhos reais.</p>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                            <Zap className="h-3 w-3 text-green-500 fill-green-500" />
                            <p className="text-[10px] text-green-500 font-black uppercase tracking-wider">Operações Sincronizadas</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};