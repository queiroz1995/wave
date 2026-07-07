"use client";

import React from "react";
import {
    Bot,
    BrainCircuit,
    DollarSign,
    FileSpreadsheet,
    Power,
    RefreshCw,
    TrendingDown,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SettingsSheet } from "./SettingsSheet";

interface AIOperatingHeroCardProps {
    selectedAIInfo: { image?: string } | null;
    totalProfit: number;
    isBotRunning: boolean;
    isPaused: boolean;
    isManipulationDetected: boolean;
    isConnected: boolean;
    accountType: "real" | "demo";
    accountBalance: number | null;
    onStartClick: () => void;
    onExit: () => void;
    onReconnect: () => void;
    children: React.ReactNode;
}

export const AIOperatingHeroCard = ({
    selectedAIInfo,
    totalProfit,
    isBotRunning,
    isPaused,
    isManipulationDetected,
    isConnected,
    accountType,
    accountBalance,
    onStartClick,
    onExit,
    onReconnect,
    children
}: AIOperatingHeroCardProps) => {
    const isWin = totalProfit >= 0;

    return (
        <Card className="relative overflow-hidden bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] rounded-[1.5rem] transition-all duration-500 hover:border-cyan-500/20">
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-[50px] -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-[50px] -ml-16 -mb-16" />

            <CardContent className="p-3.5 sm:p-5 space-y-4 relative z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-lg blur opacity-25" />
                            <div className="h-10 w-10 bg-slate-900 rounded-lg p-0.5 shadow-2xl border border-white/10 overflow-hidden">
                                {selectedAIInfo?.image ? (
                                    <img
                                        src={selectedAIInfo.image}
                                        alt=""
                                        className="w-full h-full object-cover rounded-md"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                        <Bot className="h-4 w-4 text-cyan-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1">
                                <h2 className="text-sm font-black text-white italic tracking-tighter">WAVE SNIPER</h2>
                                <div className="px-1 py-0.5 bg-cyan-500/20 rounded border border-cyan-500/30">
                                    <span className="text-[6px] font-black text-cyan-400 uppercase">PRO</span>
                                </div>
                            </div>
                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">
                                Neural Engine v2.4.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <SettingsSheet
                            trigger={
                                <Button
                                    variant="ghost"
                                    className="h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all px-3 gap-2"
                                >
                                    <FileSpreadsheet className="h-3 w-3 text-slate-300" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Planilha</span>
                                </Button>
                            }
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                            onClick={onExit}
                        >
                            <Power className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col items-center py-1 relative">
                    <div
                        className={cn(
                            "absolute inset-0 blur-[60px] opacity-20 -z-10 transition-all duration-1000",
                            isWin ? "bg-emerald-500" : "bg-rose-500"
                        )}
                    />
                    <div className="flex items-center gap-1 mb-0.5">
                        {isWin ? <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> : <TrendingDown className="h-2.5 w-2.5 text-rose-400" />}
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Resultado da Sessão</span>
                    </div>
                    <div
                        className={cn(
                            "text-4xl sm:text-5xl font-black tracking-tighter leading-none transition-all duration-700 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]",
                            isWin ? "text-emerald-400" : "text-rose-400"
                        )}
                    >
                        <span className="text-xl opacity-40 mr-0.5 font-medium font-sans">$</span>
                        {totalProfit.toFixed(2)}
                    </div>
                </div>

                <Button
                    onClick={onStartClick}
                    disabled={!isConnected || isPaused || isManipulationDetected}
                    className={cn(
                        "group relative w-full h-14 rounded-xl overflow-hidden transition-all duration-500 shadow-2xl active:scale-95",
                        isBotRunning ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20" : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-cyan-500/20"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    <span className="relative flex items-center gap-1.5 text-sm font-black uppercase tracking-[0.2em]">
                        {isBotRunning ? (
                            <>
                                PARAR
                                <Power className="h-3.5 w-3.5" />
                            </>
                        ) : (
                            <>
                                INICIAR
                                <BrainCircuit className="h-3.5 w-3.5" />
                            </>
                        )}
                    </span>
                </Button>

                {children}

                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner transition-colors duration-500",
                                accountType === "real" ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
                            )}
                        >
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Saldo</p>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-[9px] font-bold text-slate-400">$</span>
                                <p className="text-base font-black text-white tracking-tighter leading-none">
                                    {accountBalance?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }) || "0.00"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 hover:rotate-180 transition-all duration-500"
                        onClick={onReconnect}
                    >
                        <RefreshCw className="h-3 w-3 text-slate-400" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};