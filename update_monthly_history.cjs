const fs = require('fs');

const content = `"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { getTradeHistory, clearTradeHistory, PersistedTrade } from '@/utils/tradeStorage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, ChevronDown, ChevronUp, Edit2, Check, Target, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export const MonthlyHistory = () => {
    const [history, setHistory] = useState<PersistedTrade[]>(() => getTradeHistory());
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    
    const [dailyMeta, setDailyMeta] = useState<number>(0);
    const [dailyLoss, setDailyLoss] = useState<number>(0);
    const [isEditingGoals, setIsEditingGoals] = useState(false);
    const [metaInput, setMetaInput] = useState("");
    const [lossInput, setLossInput] = useState("");

    useEffect(() => {
        const savedMeta = localStorage.getItem('deriv_bot_daily_meta');
        const savedLoss = localStorage.getItem('deriv_bot_daily_loss');
        if (savedMeta) {
            setDailyMeta(Number(savedMeta));
            setMetaInput(savedMeta);
        } else {
            setMetaInput("50");
            setDailyMeta(50);
        }
        
        if (savedLoss) {
            setDailyLoss(Number(savedLoss));
            setLossInput(savedLoss);
        } else {
            setLossInput("20");
            setDailyLoss(20);
        }
    }, []);

    const saveGoals = () => {
        const m = Number(metaInput);
        const l = Number(lossInput);
        if (!isNaN(m) && m > 0) {
            setDailyMeta(m);
            localStorage.setItem('deriv_bot_daily_meta', m.toString());
        }
        if (!isNaN(l) && l > 0) {
            setDailyLoss(l);
            localStorage.setItem('deriv_bot_daily_loss', l.toString());
        }
        setIsEditingGoals(false);
        toast.success("Metas salvas com sucesso!");
    };

    const handleClear = () => {
        if (window.confirm("Tem certeza que deseja limpar TODO o histórico salvo localmente? Esta ação não pode ser desfeita.")) {
            clearTradeHistory();
            setHistory([]);
            toast.success("Histórico limpo com sucesso!");
        }
    };

    const toggleDay = (dayStr: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayStr]: !prev[dayStr]
        }));
    };

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
            return \`\${day}/\${month}/\${year}\`;
        } catch (e) {
            return dateStr;
        }
    };

    useEffect(() => {
        const handleFocus = () => {
            setHistory(getTradeHistory());
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    return (
        <div className="space-y-3">
            {/* Metas e Loss (Estilo Planilha) */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Target className="h-3 w-3 text-cyan-400" />
                            Gerenciamento de Risco
                        </span>
                        {!isEditingGoals ? (
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-white/10 rounded" onClick={() => setIsEditingGoals(true)}>
                                <Edit2 className="h-3 w-3 text-slate-400" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-emerald-500/20 rounded" onClick={saveGoals}>
                                <Check className="h-3 w-3 text-emerald-400" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-2 flex flex-col justify-center">
                            <span className="text-[8px] font-black uppercase text-emerald-500/70 tracking-wider mb-1">Meta (Take Profit)</span>
                            {isEditingGoals ? (
                                <div className="flex items-center">
                                    <span className="text-emerald-400 text-xs mr-1">$</span>
                                    <Input 
                                        type="number" 
                                        value={metaInput} 
                                        onChange={(e) => setMetaInput(e.target.value)}
                                        className="h-5 bg-transparent border-none p-0 text-xs font-black text-emerald-400 focus-visible:ring-0" 
                                    />
                                </div>
                            ) : (
                                <span className="text-xs font-black text-emerald-400 tracking-tight">$\\{dailyMeta.toFixed(2)}</span>
                            )}
                        </div>
                        <div className="bg-black/40 border border-rose-500/20 rounded-lg p-2 flex flex-col justify-center">
                            <span className="text-[8px] font-black uppercase text-rose-500/70 tracking-wider mb-1 flex items-center gap-1">
                                <AlertOctagon className="h-2 w-2" />
                                Limite (Stop Loss)
                            </span>
                            {isEditingGoals ? (
                                <div className="flex items-center">
                                    <span className="text-rose-400 text-xs mr-1">$</span>
                                    <Input 
                                        type="number" 
                                        value={lossInput} 
                                        onChange={(e) => setLossInput(e.target.value)}
                                        className="h-5 bg-transparent border-none p-0 text-xs font-black text-rose-400 focus-visible:ring-0" 
                                    />
                                </div>
                            ) : (
                                <span className="text-xs font-black text-rose-400 tracking-tight">$\\{dailyLoss.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {stats ? (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Lucro Total</span>
                            <span className={cn(
                                "text-xs font-black tracking-tight",
                                stats.totalProfit > 0 ? "text-emerald-400" : stats.totalProfit < 0 ? "text-rose-400" : "text-amber-400"
                            )}>
                                $\\{stats.totalProfit.toFixed(2)}
                            </span>
                        </div>
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Win Rate</span>
                            <span className="text-xs font-black text-cyan-400 tracking-tight">
                                \\{stats.winRate.toFixed(1)}%
                            </span>
                        </div>
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Operações</span>
                            <span className="text-xs font-black text-white tracking-tight">
                                \\{stats.totalTrades}
                            </span>
                        </div>
                    </div>

                    {/* Tabela estilo Planilha */}
                    <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
                        <div className="grid grid-cols-4 bg-black/40 p-2 border-b border-white/5">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Data</div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-center">Trades</div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-right">Resultado</div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-right">Status</div>
                        </div>
                        
                        <ScrollArea className="h-40">
                            <div className="divide-y divide-white/5">
                                {stats.sortedDays.map(day => {
                                    const isExpanded = !!expandedDays[day.date];
                                    const hitMeta = day.profit >= dailyMeta;
                                    const hitLoss = day.profit <= -dailyLoss;
                                    
                                    return (
                                        <div key={day.date} className="flex flex-col">
                                            <div 
                                                onClick={() => toggleDay(day.date)}
                                                className="grid grid-cols-4 items-center p-2 hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300">
                                                    {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronUp className="h-3 w-3 text-slate-500" />}
                                                    \\{formatDayLabel(day.date)}
                                                </div>
                                                <div className="text-[8px] font-bold text-slate-400 text-center">
                                                    <span className="text-emerald-500/70">\\{day.wins}</span>/<span className="text-rose-500/70">\\{day.losses}</span>
                                                </div>
                                                <div className={cn(
                                                    "text-[10px] font-black text-right tracking-tighter",
                                                    day.profit > 0 ? "text-emerald-400" : day.profit < 0 ? "text-rose-400" : "text-amber-400"
                                                )}>
                                                    {day.profit > 0 ? "+" : ""}$\\{day.profit.toFixed(2)}
                                                </div>
                                                <div className="flex justify-end items-center">
                                                    {hitMeta ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">Meta Hit</span>
                                                    ) : hitLoss ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">Stop Loss</span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">Em Andamento</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Detalhes (Expanded) */}
                                            {isExpanded && (
                                                <div className="bg-black/20 p-2 space-y-1 inset-shadow">
                                                    {day.trades.map((trade, i) => (
                                                        <div key={trade.id} className="grid grid-cols-4 items-center text-[8px] font-mono p-1 rounded hover:bg-white/5 border border-transparent hover:border-white/5">
                                                            <div className="text-slate-500">\\{trade.timestamp}</div>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className={cn(
                                                                    "px-1 py-[1px] rounded text-[7px] font-black",
                                                                    trade.result === 'WIN' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                                                )}>\\{trade.signal}</span>
                                                            </div>
                                                            <div className="text-slate-400 text-right">$\\{trade.stake.toFixed(2)}</div>
                                                            <div className={cn(
                                                                "font-bold text-right",
                                                                trade.profit > 0 ? "text-emerald-400" : trade.profit < 0 ? "text-rose-400" : "text-amber-400"
                                                            )}>
                                                                {trade.profit > 0 ? "+" : ""}$\\{trade.profit.toFixed(2)}
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
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-6 text-[8px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg px-2"
                        >
                            <Trash2 className="h-3 w-3 mr-1" /> Limpar Dados
                        </Button>
                    </div>
                </>
            ) : (
                <div className="py-10 text-center">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/5 mb-2 border border-white/5">
                        <Calendar className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                        Planilha Vazia
                    </p>
                </div>
            )}
        </div>
    );
};
`.replace(/\\{/g, '{');
fs.writeFileSync('src/components/bot/MonthlyHistory.tsx', content);
