"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Zap } from 'lucide-react';
import { GlobalRouletteStats } from './GlobalRouletteStats';

export const RouletteHistory = () => {
    const { rouletteHistory, isRouletteSpinning } = useBotContext();

    const getDigitColor = (digit: number) => {
        if (digit === 0) return "bg-blue-600";
        if (digit % 2 === 0) return "bg-emerald-600";
        return "bg-rose-600";
    };

    // Mostra exatamente os 50 mais recentes que estão no estado (já filtrados no Context)
    const displayHistory = rouletteHistory.slice(0, 50);

    return (
        <div className="space-y-6">
            <GlobalRouletteStats />
            
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        Histórico de Sorteios (Últimas 50 Rodadas)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/20 rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                            {isRouletteSpinning && (
                                <div className="aspect-square rounded-md bg-primary/20 flex items-center justify-center animate-spin">
                                    <Zap className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            {displayHistory.map((digit: number, i: number) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "aspect-square rounded-md flex items-center justify-center text-sm font-black text-white shadow-sm",
                                        getDigitColor(digit)
                                    )}
                                >
                                    {digit}
                                </div>
                            ))}
                            {displayHistory.length === 0 && (
                                <div className="col-span-full py-10 text-center text-muted-foreground text-xs">
                                    Buscando histórico de 50 resultados recentes...
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};