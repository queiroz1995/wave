"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export const GlobalRouletteStats = () => {
    const [globalStats, setGlobalStats] = useState<number[]>(Array(10).fill(0));
    const [totalResults, setTotalResults] = useState(0);

    const fetchStats = async () => {
        const { data, error } = await supabase
            .from('roulette_results')
            .select('number')
            .order('timestamp', { ascending: false })
            .limit(1000);

        if (!error && data) {
            const counts = Array(10).fill(0);
            data.forEach(item => {
                if (item.number >= 0 && item.number <= 9) {
                    counts[item.number]++;
                }
            });
            setGlobalStats(counts);
            setTotalResults(data.length);
        }
    };

    useEffect(() => {
        fetchStats();
        
        // Inscreve para atualizações em tempo real
        const channel = supabase
            .channel('public:roulette_results')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roulette_results' }, () => {
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const hotNumbers = useMemo(() => {
        return globalStats
            .map((count, num) => ({ num, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [globalStats]);

    const getDigitColor = (digit: number) => {
        if (digit === 0) return "bg-blue-600";
        if (digit % 2 === 0) return "bg-emerald-600";
        return "bg-rose-600";
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Estatísticas Globais (Real-Time)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    {hotNumbers.map((item, i) => (
                        <div key={i} className="bg-muted/30 p-2 rounded-lg text-center border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase font-black">Quente {i+1}</p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className={cn("w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white", getDigitColor(item.num))}>
                                    {item.num}
                                </span>
                                <span className="text-xs font-black">{totalResults > 0 ? Math.round((item.count / totalResults) * 100) : 0}%</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Distribuição Geral
                    </p>
                    <div className="space-y-1.5">
                        {globalStats.map((count, num) => {
                            const percent = totalResults > 0 ? (count / totalResults) * 100 : 0;
                            return (
                                <div key={num} className="flex items-center gap-2">
                                    <span className={cn("w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold text-white shrink-0", getDigitColor(num))}>
                                        {num}
                                    </span>
                                    <Progress value={percent} className="h-1.5 flex-grow" />
                                    <span className="text-[9px] font-mono min-w-[25px] text-right">{Math.round(percent)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <p className="text-[9px] text-center text-muted-foreground italic">
                    Baseado nas últimas {totalResults} rodadas de todos os usuários.
                </p>
            </CardContent>
        </Card>
    );
};