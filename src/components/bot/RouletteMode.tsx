"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Timer, Zap, Trophy, History, Plus, Minus, RotateCcw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export const RouletteMode = () => {
    const { 
        rouletteTimer, isRouletteSpinning, rouletteHistory, 
        selectedRouletteNumbers, setSelectedRouletteNumbers,
        lastSelectedRouletteNumbers, lastDigits,
        initialStake, setInitialStake, isConnected 
    } = useBotContext();

    const isBettingOpen = rouletteTimer > 4;
    const progress = (rouletteTimer / 16) * 100;

    // Calcula a porcentagem de cada dígito nos últimos 100 ticks
    const stats = useMemo(() => {
        const recent = lastDigits.slice(0, 100);
        if (recent.length === 0) return Array(10).fill(0);
        
        const counts = Array(10).fill(0);
        recent.forEach((d: number) => counts[d]++);
        return counts.map(c => Math.round((c / recent.length) * 100));
    }, [lastDigits]);

    const toggleNumber = (num: number) => {
        if (!isBettingOpen) return;
        setSelectedRouletteNumbers((prev: number[]) => 
            prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
        );
    };

    const handleRepeatBet = () => {
        if (!isBettingOpen) {
            toast.error("Apostas fechadas!");
            return;
        }
        if (lastSelectedRouletteNumbers.length === 0) {
            toast.info("Nenhuma aposta anterior para repetir.");
            return;
        }
        setSelectedRouletteNumbers(lastSelectedRouletteNumbers);
        toast.success("Aposta repetida!");
    };

    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.');
        if (/^\d*\.?\d*$/.test(val)) {
            setInitialStake(val);
        }
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
                
                {/* Temporizador Central */}
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
                                {isBettingOpen ? "Apostas" : "Girando"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Badge variant={isBettingOpen ? "default" : "destructive"} className="px-4 py-1 uppercase font-bold animate-pulse">
                            {isBettingOpen ? "Apostas Abertas" : "Sorteando..."}
                        </Badge>
                        
                        {isBettingOpen && lastSelectedRouletteNumbers.length > 0 && selectedRouletteNumbers.length === 0 && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleRepeatBet}
                                className="h-6 text-[10px] font-black border-primary/50 text-primary hover:bg-primary/10"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" /> REPETIR
                            </Button>
                        )}
                    </div>
                </div>

                {/* Controle de Stake */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Valor por Número (Stake)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(-1)}><Minus className="h-4 w-4" /></Button>
                        <Input 
                            value={initialStake} 
                            onChange={handleStakeChange} 
                            className="text-center text-xl font-black h-10 border-primary/40 bg-background/50" 
                        />
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>

                {/* Grelha de Apostas 0-9 com Porcentagens */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1 mb-1">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Frequência (Últimos 100)</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <div key={num} className="flex flex-col gap-1">
                                <span className={cn(
                                    "text-[9px] text-center font-black",
                                    stats[num] > 12 ? "text-primary" : stats[num] < 8 ? "text-muted-foreground/50" : "text-muted-foreground"
                                )}>
                                    {stats[num]}%
                                </span>
                                <button
                                    onClick={() => toggleNumber(num)}
                                    disabled={!isBettingOpen}
                                    className={cn(
                                        "h-14 rounded-xl flex flex-col items-center justify-center transition-all border-2",
                                        selectedRouletteNumbers.includes(num) 
                                            ? "border-primary bg-primary/20 scale-95" 
                                            : "border-white/5 bg-muted/30 hover:bg-muted/50",
                                        !isBettingOpen && "opacity-50 grayscale"
                                    )}
                                >
                                    <span className={cn("w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold text-white mb-1", getDigitColor(num))}>
                                        {num}
                                    </span>
                                    <span className="text-[10px] font-black">${selectedRouletteNumbers.includes(num) ? initialStake : "0.00"}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Histórico de Resultados Recentes */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                            <History className="h-3 w-3" /> Resultados Recentes
                        </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {isRouletteSpinning && (
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center animate-spin">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        {rouletteHistory.map((digit, i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "w-10 h-10 min-w-[40px] rounded-lg flex items-center justify-center text-lg font-black text-white",
                                    getDigitColor(digit)
                                )}
                            >
                                {digit}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    {!isConnected && (
                        <p className="text-[10px] text-yellow-500 font-bold mb-2">
                            MODO SIMULAÇÃO: Conecte o Token para apostas reais.
                        </p>
                    )}
                    <p className="text-[10px] text-muted-foreground italic">
                        Ganho: 9x o valor apostado se acertar o dígito exato.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};