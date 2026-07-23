"use client";

import React, { useState, useMemo } from 'react';
import { getTradeHistory, clearTradeHistory, PersistedTrade } from '@/utils/tradeStorage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

export const MonthlyHistory = () => {
    const [history, setHistory] = useState<PersistedTrade[]>(() => getTradeHistory());
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const handleClear = () => {
        if (window.confirm("Tem certeza que deseja limpar TODO o histórico salvo localmente? Esta ação não pode ser desfeita.")) {
            clearTradeHistory();
            setHistory([]);
            toast.success("Histórico de longo prazo limpo com sucesso!");
        }
    };

    const toggleDay = (dayStr: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayStr]: !prev[dayStr]
        }));
    };

    // Agrupa os dados por mês e dia
    const stats = useMemo(() => {
        if (history.length === 0) return null;

        let totalProfit = 0;
        let wins = 0;
        let losses = 0;
        const dailyData: Record<string, {
            date: string;
            profit: number;
            wins: number;
            losses: number;
            trades: PersistedTrade[];
        }> = {};

        history.forEach(trade => {
            totalProfit += trade.profit;
            if (trade.result === 'WIN') wins++;
            else losses++;

            if (!dailyData[trade.date]) {
                dailyData[trade.date] = {
                    date: trade.date,
                    profit: 0,
                    wins: 0,
                    losses: 0,
                    trades: []
                };
            }

            const day = dailyData[trade.date];
            day.profit += trade.profit;
            if (trade.result === 'WIN') day.wins++;
            else day.losses++;
            day.trades.push(trade);
        });

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        // Ordena os dias do mais recente para o mais antigo
        const sortedDays = Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date));

        return {
            totalProfit,
            wins,
            losses,
            totalTrades,
            winRate,
            sortedDays
        };
    }, [history]);

    const formatDayLabel = (dateStr: string) => {
        try {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Atualiza o histórico quando o componente foca ou é montado
    React.useEffect(() => {
        const handleFocus = () => {
            setHistory(getTradeHistory());
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    return (
        <div className="space-y-3">
            {stats ? (
                <>
                    {/* Cards de Resumo Mensal */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Lucro Total</span>
                            <span className={cn(
                                "text-xs font-black tracking-tight",
                                stats.totalProfit > 0 ? "text-emerald-400" : stats.totalProfit < 0 ? "text-rose-400" : "text-amber-400"
                            )}>
                                ${stats.totalProfit.toFixed(2)}
                            </span>
                        </div>
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Assertividade</span>
                            <span className="text-xs font-black text-cyan-400 tracking-tight">
                                {stats.winRate.toFixed(1)}%
                            </span>
                        </div>
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Operações</span>
                            <span className="text-xs font-black text-white tracking-tight">
                                {stats.totalTrades}
                            </span>
                        </div>
                    </div>

                    {/* Lista de Dias */}
                    <ScrollArea className="h-48 pr-1">
                        <div className="space-y-2">
                            {stats.sortedDays.map(day => {
                                const isExpanded = !!expandedDays[day.date];
                                const isDayWin = day.profit > 0;

                                return (
                                    <div 
                                        key={day.date}
                                        className="bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden transition-all"
                                    >
                                        {/* Cabeçalho do Dia */}
                                        <div 
                                            onClick={() => toggleDay(day.date)}
                                            className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-[10px] font-black text-white">
                                                    {formatDayLabel(day.date)}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-500">
                                                    ({day.wins}V - {day.losses}D)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black",
                                                    isDayWin ? "text-emerald-400" : day.profit < 0 ? "text-rose-400" : "text-amber-400"
                                                )}>
                                                    {day.profit > 0 ? "+" : ""}${day.profit.toFixed(2)}
                                                </span>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                                                ) : (
                                                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Detalhes do Dia (Trades Individuais) */}
                                        {isExpanded && (
                                            <div className="border-t border-white/5 bg-black/20 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {day.trades.map(trade => (
                                                    <div 
                                                        key={trade.id}
                                                        className="flex items-center justify-between text-[9px] font-mono p-1.5 rounded bg-slate-950/40 border border-white/5"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500 text-[8px]">{trade.timestamp}</span>
                                                            <span className={cn(
                                                                "px-1 rounded text-[8px] font-black",
                                                                trade.result === 'WIN' 
                                                                    ? "bg-emerald-500/10 text-emerald-400" 
                                                                    : "bg-rose-500/10 text-rose-400"
                                                            )}>
                                                                {trade.signal}
                                                            </span>
                                                            <span className="text-slate-400 text-[8px]">{trade.asset}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500">Stake: ${trade.stake.toFixed(2)}</span>
                                                            <span className={cn(
                                                                "font-bold",
                                                                trade.profit > 0 ? "text-emerald-400" : trade.profit < 0 ? "text-rose-400" : "text-amber-400"
                                                            )}>
                                                                {trade.profit > 0 ? "+" : ""}${trade.profit.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {/* Botão de Limpar Histórico */}
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-7 text-[8px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                        >
                            <Trash2 className="h-3 w-3 mr-1" /> Limpar Histórico Local
                        </Button>
                    </div>
                </>
            ) : (
                <div className="py-10 text-center">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/5 mb-2 border border-white/5">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                        Nenhum registro de longo prazo ainda...
                    </p>
                    <p className="text-[8px] text-slate-600 uppercase tracking-wider mt-1">
                        As operações concluídas serão salvas automaticamente aqui.
                    </p>
                </div>
            )}
        </div>
    );
};