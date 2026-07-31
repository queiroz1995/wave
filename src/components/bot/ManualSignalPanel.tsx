"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ContractType } from "@/types/bot";
import { useBotContext } from "@/context/BotContext";

interface ManualSignalIntelligence {
    recommendation: string;
    confidence: number;
    evenPercent: number;
    oddPercent: number;
    reason: string;
}

interface ManualSignalPanelProps {
    showManualConfirm: boolean;
    setShowManualConfirm: (value: boolean) => void;
    manualSignalIntelligence: ManualSignalIntelligence;
    isConnected: boolean;
    isTradePending: boolean;
    onManualClick: (type: ContractType) => void;
}

export const ManualSignalPanel = ({
    showManualConfirm,
    setShowManualConfirm,
    manualSignalIntelligence,
    isConnected,
    isTradePending,
    onManualClick
}: ManualSignalPanelProps) => {
    const { initialStake, setInitialStake } = useBotContext();

    const handleDoubleStake = () => {
        const current = parseFloat(initialStake) || 0.35;
        setInitialStake((current * 2).toFixed(2));
    };

    const handleHalfStake = () => {
        const current = parseFloat(initialStake) || 0.35;
        setInitialStake(Math.max(0.35, current / 2).toFixed(2));
    };

    return (
        <div className="space-y-2.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                    Sinal de Entrada Manual
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Confirmar</span>
                    <Switch
                        checked={showManualConfirm}
                        onCheckedChange={setShowManualConfirm}
                        className="h-3.5 w-6 [&>span]:h-2.5 [&>span]:w-2.5"
                    />
                </div>
            </div>

            <div
                className={cn(
                    "p-2.5 rounded-xl border transition-all duration-500 flex flex-col gap-1.5",
                    manualSignalIntelligence.recommendation === "PAR"
                        ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                        : manualSignalIntelligence.recommendation === "ÍMPAR"
                            ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                            : "bg-slate-900/40 border-white/5"
                )}
            >
                <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Recomendação I.A</span>
                    {manualSignalIntelligence.confidence > 0 && (
                        <span
                            className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded-full",
                                manualSignalIntelligence.recommendation === "PAR"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-rose-500/20 text-rose-400"
                            )}
                        >
                            {manualSignalIntelligence.confidence}% Confiança
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-1.5">
                    <span
                        className={cn(
                            "text-xl font-black tracking-tight",
                            manualSignalIntelligence.recommendation === "PAR"
                                ? "text-emerald-400"
                                : manualSignalIntelligence.recommendation === "ÍMPAR"
                                    ? "text-rose-400"
                                    : "text-slate-400"
                        )}
                    >
                        {manualSignalIntelligence.recommendation}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium truncate">
                        {manualSignalIntelligence.reason}
                    </span>
                </div>

                <div className="space-y-0.5">
                    <div className="flex justify-between text-[7px] font-bold text-slate-500">
                        <span>PAR: {manualSignalIntelligence.evenPercent}%</span>
                        <span>ÍMPAR: {manualSignalIntelligence.oddPercent}%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${manualSignalIntelligence.evenPercent}%` }}
                        />
                        <div
                            className="bg-rose-500 h-full transition-all duration-500"
                            style={{ width: `${manualSignalIntelligence.oddPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <button
                    type="button"
                    onClick={() => onManualClick("DIGITEVEN")}
                    disabled={!isConnected || isTradePending}
                    className="h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    PAR
                </button>
                <button
                    type="button"
                    onClick={() => onManualClick("DIGITODD")}
                    disabled={!isConnected || isTradePending}
                    className="h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    ÍMPAR
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <button
                    type="button"
                    onClick={handleDoubleStake}
                    className="h-9 rounded-xl border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                >
                    Dobrar (${(parseFloat(initialStake) || 0.35).toFixed(2)})
                </button>
                <button
                    type="button"
                    onClick={handleHalfStake}
                    className="h-9 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                >
                    Metade (${(Math.max(0.35, (parseFloat(initialStake) || 0.35) / 2)).toFixed(2)})
                </button>
            </div>
        </div>
    );
};