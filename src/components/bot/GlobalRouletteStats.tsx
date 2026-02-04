"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export const GlobalRouletteStats = () => {
    const [globalStats, setGlobalStats] = useState<number[]>(Array(10).fill(0));
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('roulette_results')
                .select('number')
                .order('timestamp', { ascending: false })
                .limit(1000);

            if (error) throw error;

            if (data) {
                const counts = Array(10).fill(0);
                data.forEach(item => {
                    if (typeof item.number === 'number' && item.number >= 0 && item.number <= 9) {
                        counts[item.number]++;
                    }
                });
                setGlobalStats(counts);
                setTotalResults(data.length);
            }
        } catch (err) {
            console.error("[Stats] Erro ao buscar estatísticas:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        
        // Canal de tempo real mais específico
        const channel = supabase
            .channel('roulette_stats_updates')
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'roulette_results' }, 
                () => {
                    fetchStats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchStats]);

    const hotNumbers = useMemo(() => {
        if (totalResults === 0) return [];
        return globalStats
            .map((count, num) => ({ num, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [globalStats, totalResults]);

    const getDigitColor = (digit: number) => {
        if (digit === 0) return "bg-blue-600";
        if (digit % 2 === 0) return "bg-emerald-600";
        return "bg-rose-600";
    };

    if (isLoading) {
        return (
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="h-40 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Carregando Dados...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardContent className="space-y-4 pt-4">
                {/* NUMEROS QUENTES */}
                <div className="grid grid-cols-3 gap-2">
                    {hotNumbers.length > 0 ? (
                        hotNumbers.map((item, i) => (
                            <div key={i} className="bg-muted/30 p-2 rounded-lg text-center border border-white/5">
                                <p className="text-[10px] text-muted-foreground uppercase font-black">Quente {i+1}</p>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <span className={cn("w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white", getDigitColor(item.num))}>
                                        {item.num}
                                    </span>
                                    <span className="text-xs font-black">
                                        {totalResults > 0 ? Math.round((item.count / totalResults) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 py-2 text-center text-[10px] text-muted-foreground italic">
                            Aguardando primeiros resultados...
                        </div>
                    )}
                </div>

                {/* DISTRIBUIÇÃO */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Distribuição (Últimas {totalResults})
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
                
                {totalResults > 0 && (
                    <p className="text-[9px] text-center text-muted-foreground italic">
                        Dados globais atualizados em tempo real.
                    </p>
                )}
            </CardContent>
        </Card>
    );
};