"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BarChart3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RouletteAnalyzer = () => {
    const { rouletteHistory } = useBotContext();

    const calculateStats = (windowSize: number) => {
        const history = rouletteHistory.slice(0, windowSize);
        if (history.length === 0) return { maxEven: 0, maxOdd: 0, totalEven: 0, totalOdd: 0 };

        let maxEven = 0;
        let maxOdd = 0;
        let currentEven = 0;
        let currentOdd = 0;
        let totalEven = 0;
        let totalOdd = 0;

        history.forEach((num: number) => {
            if (num % 2 === 0) {
                totalEven++;
                currentEven++;
                maxOdd = Math.max(maxOdd, currentOdd);
                currentOdd = 0;
            } else {
                totalOdd++;
                currentOdd++;
                maxEven = Math.max(maxEven, currentEven);
                currentEven = 0;
            }
        });

        // Check final streaks
        maxEven = Math.max(maxEven, currentEven);
        maxOdd = Math.max(maxOdd, currentOdd);

        return { maxEven, maxOdd, totalEven, totalOdd };
    };

    const windows = [25, 35, 96];

    return (
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Recordes e Tendências
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden border rounded-xl bg-muted/20">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase">Período</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-emerald-500">Máx Par</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-rose-500">Máx Ímpar</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center">T. Par</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center">T. Ímpar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {windows.map(size => {
                                const stats = calculateStats(size);
                                return (
                                    <TableRow key={size} className="border-white/5">
                                        <TableCell className="font-black text-xs">{size} Rodadas</TableCell>
                                        <TableCell className="text-emerald-500 font-black text-lg">{stats.maxEven}x</TableCell>
                                        <TableCell className="text-rose-500 font-black text-lg">{stats.maxOdd}x</TableCell>
                                        <TableCell className="text-center font-bold text-xs bg-emerald-500/5">{stats.totalEven}</TableCell>
                                        <TableCell className="text-center font-bold text-xs bg-rose-500/5">{stats.totalOdd}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase">Dica Rico 2.0</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Se o mercado atingiu a máxima de 5 ou 6 Pares nas últimas 96 rodadas, espere uma sequência de 3 ou 4 Pares e entre contra essa tendência.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};