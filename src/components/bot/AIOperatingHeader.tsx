"use client";

import React from "react";
import { Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBotContext } from "@/context/BotContext";
import { Settings, Zap, X, ChevronLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AIOperatingHeader = () => {
    const {
        asset,
        accountBalance,
        totalProfit,
        wins,
        losses,
        isBotRunning,
        toggleBot,
        exitToSelection,
        setIsSettingsOpen,
        isConnected,
        isPaused,
        takeProfit,
        stopLoss,
        currency,
        isStudying,
        currentConfidence
    } = useBotContext();

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const formattedBalance = accountBalance !== null ? accountBalance.toFixed(2) : '0.00';
    const formattedProfit = totalProfit.toFixed(2);
    const profitColor = totalProfit >= 0 ? "text-emerald-400" : "text-rose-400";

    return (
        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
                {/* Botão de Voltar */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={exitToSelection}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl p-1 pr-2.5 rounded-full border border-white/10">
                    <div
                        className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-500",
                            isBotRunning ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800/50 text-slate-500"
                        )}
                    >
                        <Activity className={cn("h-2.5 w-2.5", isBotRunning && "animate-pulse")} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-slate-400">
                            Status
                        </span>
                        <span
                            className={cn(
                                "text-[7px] font-bold uppercase tracking-widest leading-none mt-0.5",
                                isBotRunning ? "text-emerald-400" : "text-slate-500"
                            )}
                        >
                            {isBotRunning ? (isStudying ? "Sincronizando..." : isPaused ? "Pausado" : "Sniper Online") : "Offline"}
                        </span>
                    </div>
                </div>

                {isBotRunning && !isStudying && (
                    <div className="flex items-center gap-1 bg-cyan-500/10 backdrop-blur-xl px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                        <Target className="h-2.5 w-2.5 text-cyan-400 animate-pulse" />
                        <span className="text-[8px] font-black text-cyan-400 tracking-wider">{currentConfidence}% Precisão</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                        Saldo ({currency})
                    </span>
                    <span className="text-xs font-black text-white tracking-tight">
                        {formattedBalance}
                    </span>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                        Lucro ({currency})
                    </span>
                    <span className={cn("text-xs font-black tracking-tight", profitColor)}>
                        {formattedProfit}
                    </span>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                        Assertividade
                    </span>
                    <span className="text-xs font-black text-cyan-400 tracking-tight">
                        {winRate.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Painel de Risco (Meta e Loss) */}
            {!isBotRunning && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> Meta ({currency})
                        </span>
                        <span className="text-xs font-black text-emerald-400 tracking-tight">
                            {takeProfit && parseFloat(takeProfit) > 0 ? parseFloat(takeProfit).toFixed(2) : 'N/A'}
                        </span>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-1">
                            <TrendingDown className="h-2.5 w-2.5 text-rose-400" /> Loss ({currency})
                        </span>
                        <span className="text-xs font-black text-rose-400 tracking-tight">
                            {stopLoss && parseFloat(stopLoss) > 0 ? parseFloat(stopLoss).toFixed(2) : 'N/A'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};