"use client";

import React, { useState } from "react";
import { RotateCcw, Target, CalendarDays, History, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MonthlyHistory } from "./MonthlyHistory";
import { useBotContext } from "@/context/BotContext";

interface OperationsFeedProps {
    signals: any[];
    onReset: () => void;
}

const getSignalLabel = (signal: string, strategy: string) => {
    const isVirtual = String(strategy || '').includes("VIRTUAL");
    let baseColor = "";
    let text = "";

    switch (signal) {
    case "EVEN":
        text = "PAR";
        baseColor = isVirtual ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        break;
    case "ODD":
        text = "ÍMPAR";
        baseColor = isVirtual ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20";
        break;
    case "CALL":
        text = "SOBE";
        baseColor = isVirtual ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        break;
    case "PUT":
        text = "DESCE";
        baseColor = isVirtual ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20";
        break;
    default:
        text = signal;
        baseColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }

    return {
        text: isVirtual ? `VIRTUAL: ${text}` : text,
        color: baseColor
    };
};

export const OperationsFeed = ({ signals, onReset }: OperationsFeedProps) => {
    const [activeTab, setActiveTab] = useState<'session' | 'monthly'>('session');
    const { activeContractTick, activeContractDigit, duration } = useBotContext();

    return (
        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3 px-1">
                {/* Abas de Navegação */}
                <div className="flex gap-1 bg-white/5 p-0.5 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('session')}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                            activeTab === 'session' 
                                ? "bg-cyan-500 text-slate-950 shadow-lg" 
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <History className="h-3 w-3" /> Sessão
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                            activeTab === 'monthly' 
                                ? "bg-cyan-500 text-slate-950 shadow-lg" 
                                : "text-slate-400 hover:text-white"
                        )}
                    >
                        <CalendarDays className="h-3 w-3" /> Mensal
                    </button>
                </div>

                {activeTab === 'session' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[8px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                        onClick={onReset}
                        title="Resetar Sessão"
                    >
                        <RotateCcw className="h-3 w-3 mr-1" /> Resetar Sessão
                    </Button>
                )}
            </div>

            {activeTab === 'session' ? (
                <ScrollArea className="h-48 pr-1">
                    <div className="space-y-1.5">
                        {signals.length > 0 ? signals.map((signal: any, index: number) => {
                            const label = getSignalLabel(signal.signal, signal.strategy);
                            const result = String(signal.result ?? signal.status ?? signal.outcome ?? '').toUpperCase();
                            const hasFinished = result === 'WIN' || result === 'LOSS';
                            const profitValue = Number.isFinite(Number(signal.profit)) ? Number(signal.profit) : 0;
                            const digitValue = signal.exitDigit ?? signal.digit ?? signal.exit_digit ?? signal.finalDigit;
                            const isVirtual = String(signal.strategy || '').includes("VIRTUAL");
                            
                            // Considera como operação ativa se não finalizou e é o primeiro item da lista (mais recente)
                            const isActiveTrade = !hasFinished && index === 0;

                            return (
                                <div
                                    key={signal.id}
                                    className={cn(
                                        "group relative flex items-center justify-between p-2 rounded-lg border transition-all duration-300",
                                        isActiveTrade 
                                            ? "bg-cyan-950/30 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
                                            : isVirtual 
                                                ? "bg-cyan-950/5 hover:bg-cyan-950/10 border-cyan-500/10"
                                                : "bg-slate-900/40 hover:bg-slate-900/80 border-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-mono text-slate-500">{signal.timestamp}</span>
                                        
                                        {isVirtual && (
                                            <span className="px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[7px] font-black uppercase tracking-wider">
                                                Virtual
                                            </span>
                                        )}

                                        <div
                                            className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border transition-all duration-300",
                                                hasFinished
                                                    ? (result === "WIN"
                                                        ? (isVirtual ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20")
                                                        : (isVirtual ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20"))
                                                    : label.color
                                            )}
                                        >
                                            {label.text}
                                        </div>
                                        {hasFinished && digitValue !== undefined && (
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-full text-[9px] font-black font-mono border",
                                                Number(digitValue) === 0
                                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                    : (Number(digitValue) % 2 === 0
                                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                        : "bg-rose-500/20 text-rose-400 border-rose-400/30")
                                            )}>
                                                Dígito: {digitValue}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "text-xs font-black tracking-tighter",
                                            !hasFinished ? "text-cyan-400" : (result === "WIN" ? (isVirtual ? "text-cyan-400" : "text-emerald-400") : "text-rose-400")
                                        )}
                                    >
                                        {hasFinished ? (
                                            <span className="flex items-center gap-0.5">
                                                {isVirtual ? (
                                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">
                                                        {result === "WIN" ? "WIN ⚡" : "LOSS 💀"}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {profitValue >= 0 ? "+" : ""}{profitValue.toFixed(2)}
                                                        {result === "WIN" ? "⚡" : "💀"}
                                                    </>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                <Timer className="h-3 w-3 text-cyan-400 animate-spin" />
                                                {isActiveTrade && activeContractTick > 0 
                                                    ? `TICK ${activeContractTick}/${duration} (${activeContractDigit !== null ? activeContractDigit : ''})` 
                                                    : "ANALISANDO..."}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-10 text-center">
                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/5 mb-1.5 border border-white/5">
                                    <Target className="h-3.5 w-3.5 text-slate-500" />
                                </div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                                    Aguardando gatilhos neurais...
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            ) : (
                <MonthlyHistory />
            )}
        </div>
    );
};