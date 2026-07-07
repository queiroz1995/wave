"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualStakeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pendingContractType: string | null;
    manualStakeValue: string;
    setManualStakeValue: (value: string) => void;
    onConfirm: () => void;
    takeProfit: string;
    stopLoss: string;
    currency: string;
    setTakeProfit: (value: string) => void;
    setStopLoss: (value: string) => void;
}

const contractTypeToLabel = (type: string | null) => {
    if (!type) return "Operação";
    if (type.includes("EVEN")) return "PAR";
    if (type.includes("ODD")) return "ÍMPAR";
    if (type.includes("CALL")) return "SOBE (CALL)";
    if (type.includes("PUT")) return "DESCE (PUT)";
    return type;
};

export const ManualStakeDialog: React.FC<ManualStakeDialogProps> = ({
    open,
    onOpenChange,
    pendingContractType,
    manualStakeValue,
    setManualStakeValue,
    onConfirm,
    takeProfit,
    stopLoss,
    currency,
    setTakeProfit,
    setStopLoss
}) => {
    const isDigitTrade = pendingContractType?.includes("DIGIT");
    const isRiseFallTrade = pendingContractType === "CALL" || pendingContractType === "PUT";
    const isWin = pendingContractType?.includes("EVEN") || pendingContractType?.includes("CALL");
    
    const parsedTakeProfit = parseFloat(takeProfit) || 0;
    const parsedStopLoss = parseFloat(stopLoss) || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[350px] rounded-xl p-6 bg-slate-900 border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                        Confirmar Entrada Manual
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-400">
                        Ajuste o valor da entrada e confirme a operação.
                    </DialogDescription>
                </DialogHeader>

                {/* Resumo da Operação */}
                <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-white/5">
                        <span className="text-sm font-semibold text-slate-300">Tipo de Sinal:</span>
                        <span className={cn(
                            "text-sm font-bold px-2 py-0.5 rounded-full",
                            isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        )}>
                            {contractTypeToLabel(pendingContractType)}
                        </span>
                    </div>

                    {/* Campo de Stake */}
                    <div className="space-y-1">
                        <label htmlFor="stake" className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Valor da Entrada ({currency})
                        </label>
                        <Input
                            id="stake"
                            type="number"
                            value={manualStakeValue}
                            onChange={(e) => setManualStakeValue(e.target.value)}
                            className="bg-slate-700/50 border-white/10 text-white focus:ring-cyan-500"
                            step="0.01"
                        />
                    </div>

                    {/* Painel de Risco */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-white/5 space-y-1">
                            <label htmlFor="takeProfit" className="text-[9px] font-black text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-400" /> Meta (Take Profit)
                            </label>
                            <Input
                                id="takeProfit"
                                type="number"
                                value={takeProfit}
                                onChange={(e) => setTakeProfit(e.target.value)}
                                className="h-8 text-sm bg-slate-700/50 border-white/10 text-emerald-400 focus:ring-emerald-500 text-center font-bold"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-white/5 space-y-1">
                            <label htmlFor="stopLoss" className="text-[9px] font-black text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                                <TrendingDown className="h-3 w-3 text-rose-400" /> Loss (Stop Loss)
                            </label>
                            <Input
                                id="stopLoss"
                                type="number"
                                value={stopLoss}
                                onChange={(e) => setStopLoss(e.target.value)}
                                className="h-8 text-sm bg-slate-700/50 border-white/10 text-rose-400 focus:ring-rose-500 text-center font-bold"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        onClick={onConfirm}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                        disabled={parseFloat(manualStakeValue) <= 0 || isNaN(parseFloat(manualStakeValue))}
                    >
                        Confirmar Entrada
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};