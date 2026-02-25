"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SlidersHorizontal, Trophy, History } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const SequenceAnalyzer = () => {
    const { 
        lastDigits = [], 
        analyzerWindowSize = 100, 
    } = useBotContext();

    // Cálculo simplificado: Apenas a MAIOR sequência encontrada
    const streakRecords = React.useMemo(() => {
        const digits = (lastDigits || []).slice(0, analyzerWindowSize);
        if (digits.length === 0) return { maxEven: 0, maxOdd: 0, currentStreak: 0, currentType: null };

        let maxEven = 0;
        let maxOdd = 0;
        let currentCount = 0;
        let currentType: 'EVEN' | 'ODD' | null = null;

        // Percorre para encontrar os recordes
        digits.forEach((digit) => {
            const type = digit % 2 === 0 ? 'EVEN' : 'ODD';
            if (type === currentType) {
                currentCount++;
            } else {
                if (currentType === 'EVEN') maxEven = Math.max(maxEven, currentCount);
                if (currentType === 'ODD') maxOdd = Math.max(maxOdd, currentCount);
                currentType = type;
                currentCount = 1;
            }
        });

        // Checagem final para a última sequência
        if (currentType === 'EVEN') maxEven = Math.max(maxEven, currentCount);
        if (currentType === 'ODD') maxOdd = Math.max(maxOdd, currentCount);

        // Sequência ATUAL (os mais recentes estão no início do array lastDigits)
        let activeCount = 1;
        const activeType = digits[0] % 2 === 0 ? 'EVEN' : 'ODD';
        for (let i = 1; i < digits.length; i++) {
            const t = digits[i] % 2 === 0 ? 'EVEN' : 'ODD';
            if (t === activeType) activeCount++;
            else break;
        }

        return { maxEven, maxOdd, activeCount, activeType };
    }, [lastDigits, analyzerWindowSize]);

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-4 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-bold">
                    <Trophy className="h-4 w-4" />Recordes de Sequência
                </CardTitle>
                <CardDescription className="text-[10px]">Análise focada nas últimas {analyzerWindowSize} rodadas.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0 space-y-6 flex flex-col justify-center">
                
                {/* RECORDES MÁXIMOS */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-green-500 uppercase mb-1">Maior Par</p>
                        <p className="text-4xl font-black text-green-500">{streakRecords.maxEven}x</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Maior Ímpar</p>
                        <p className="text-4xl font-black text-red-500">{streakRecords.maxOdd}x</p>
                    </div>
                </div>

                {/* SEQUÊNCIA ATUAL (REAL-TIME) */}
                <div className="bg-muted/30 border rounded-xl p-4 text-center relative overflow-hidden">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <History className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Sequência Atual</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className={cn(
                            "text-3xl font-black",
                            streakRecords.activeType === 'EVEN' ? "text-green-500" : "text-red-500"
                        )}>
                            {streakRecords.activeCount}x {streakRecords.activeType === 'EVEN' ? 'PAR' : 'ÍMPAR'}
                        </p>
                        <div className="flex gap-1 mt-2">
                            {Array.from({ length: Math.min(streakRecords.activeCount, 10) }).map((_, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "w-2 h-2 rounded-full animate-pulse",
                                        streakRecords.activeType === 'EVEN' ? "bg-green-500" : "bg-red-500"
                                    )} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-[9px] text-center text-muted-foreground italic px-4">
                    Dica: Use os recordes acima para decidir o momento de entrar contra a tendência.
                </p>
            </CardContent>
        </Card>
    );
};