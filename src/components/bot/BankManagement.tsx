"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Target, RotateCcw, ThumbsUp, ThumbsDown, CalendarDays } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface DayPlan {
    day: number;
    initialBankroll: number;
    goalValue: number;
    stopValue: number;
    projectedEndBankroll: number;
    isReal: boolean;
    status?: 'win' | 'loss';
    realProfit?: number;
}

export const BankManagement = () => {
    const { 
        setTakeProfit, 
        setStopLoss,
        bankManagementInitialBankroll, setBankManagementInitialBankroll,
        bankManagementDailyGoalPercent, setBankManagementDailyGoalPercent,
        bankManagementDailyStopPercent, setBankManagementDailyStopPercent,
        bankManagementCurrentDay, setBankManagementCurrentDay,
        bankManagementActualBankroll, setBankManagementActualBankroll,
        bankManagementHistory, setBankManagementHistory,
        saveDayToHistory
    } = useBotContext();

    // Mescla o histórico real com as projeções futuras para compor os 30 dias
    const plan: DayPlan[] = useMemo(() => {
        const goalPercent = parseFloat(bankManagementDailyGoalPercent) / 100 || 0.05;
        const stopPercent = parseFloat(bankManagementDailyStopPercent) / 100 || 0.15;
        const startBankroll = parseFloat(bankManagementInitialBankroll) || 100;

        const dailyPlans: DayPlan[] = [];
        let currentBankroll = startBankroll;

        // 1. Adiciona os dias que já foram concluídos e salvos no histórico real
        const historyMap = new Map<number, typeof bankManagementHistory[0]>();
        if (bankManagementHistory && bankManagementHistory.length > 0) {
            bankManagementHistory.forEach((item: any) => {
                historyMap.set(item.day, item);
            });
        }

        // Geramos 30 dias no total
        for (let d = 1; d <= 30; d++) {
            if (historyMap.has(d)) {
                const realDay = historyMap.get(d)!;
                dailyPlans.push({
                    day: d,
                    initialBankroll: realDay.initial,
                    goalValue: realDay.initial * goalPercent,
                    stopValue: realDay.initial * stopPercent,
                    projectedEndBankroll: realDay.final,
                    isReal: true,
                    status: realDay.status,
                    realProfit: realDay.profit
                });
                currentBankroll = realDay.final;
            } else {
                // Se o dia ainda não foi jogado, calcula a projeção futura
                const goalValue = currentBankroll * goalPercent;
                const stopValue = currentBankroll * stopPercent;
                const projectedEndBankroll = currentBankroll + goalValue;

                dailyPlans.push({
                    day: d,
                    initialBankroll: currentBankroll,
                    goalValue,
                    stopValue,
                    projectedEndBankroll,
                    isReal: false
                });
                currentBankroll = projectedEndBankroll;
            }
        }

        return dailyPlans;
    }, [bankManagementDailyGoalPercent, bankManagementDailyStopPercent, bankManagementInitialBankroll, bankManagementHistory]);

    const handleApplyToBot = () => {
        const currentDayPlan = plan.find(p => p.day === bankManagementCurrentDay);
        if (currentDayPlan) {
            setTakeProfit(currentDayPlan.goalValue.toFixed(2));
            setStopLoss(currentDayPlan.stopValue.toFixed(2));
            toast.success(`Metas do Dia ${currentDayPlan.day} aplicadas ao bot!`, {
                description: `Take Profit: $${currentDayPlan.goalValue.toFixed(2)} | Stop Loss: $${currentDayPlan.stopValue.toFixed(2)}`,
            });
        } else {
            toast.error("Erro ao carregar o plano do dia atual.");
        }
    };

    const handleGoalMet = () => {
        const currentDayPlan = plan.find(p => p.day === bankManagementCurrentDay);
        if (currentDayPlan) {
            saveDayToHistory('win', currentDayPlan.goalValue);
            toast.success(`Parabéns! Dia ${bankManagementCurrentDay} concluído com sucesso.`);
        }
    };

    const handleStopLossHit = () => {
        const currentDayPlan = plan.find(p => p.day === bankManagementCurrentDay);
        if (currentDayPlan) {
            saveDayToHistory('loss', -currentDayPlan.stopValue);
            toast.info(`Dia ${bankManagementCurrentDay} finalizado em stop.`);
        }
    };

    const handleResetPlan = () => {
        setBankManagementCurrentDay(1);
        setBankManagementActualBankroll(bankManagementInitialBankroll);
        setBankManagementHistory([]);
        toast.info("Gerenciamento de banca resetado para o Dia 1.");
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-primary text-base">
                    <CalendarDays className="h-4 w-4" />Planilha de Gestão Mensal
                </CardTitle>
                <CardDescription className="text-[10px]">Acompanhe seu progresso real e projeções para os 30 dias.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="initial-bankroll" className="text-[9px] font-bold uppercase tracking-wider opacity-60">Banca Inicial ($)</Label>
                        <Input
                            id="initial-bankroll"
                            value={bankManagementInitialBankroll}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*[,.]?\d*$/.test(value)) {
                                    setBankManagementInitialBankroll(value.replace(',', '.'));
                                    // Se estiver no dia 1, atualiza a banca atual também
                                    if (bankManagementCurrentDay === 1) {
                                        setBankManagementActualBankroll(value.replace(',', '.'));
                                    }
                                }
                            }}
                            placeholder="Ex: 100.00"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-[8px] font-bold uppercase opacity-60">Meta (%)</Label>
                                <span className="text-[10px] font-black text-primary">{(parseFloat(bankManagementDailyGoalPercent) || 5).toFixed(1)}%</span>
                            </div>
                            <Slider value={[parseFloat(bankManagementDailyGoalPercent) || 5]} onValueChange={(v) => setBankManagementDailyGoalPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} className="py-1" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-[8px] font-bold uppercase opacity-60">Stop (%)</Label>
                                <span className="text-[10px] font-black text-primary">{(parseFloat(bankManagementDailyStopPercent) || 10).toFixed(1)}%</span>
                            </div>
                            <Slider value={[parseFloat(bankManagementDailyStopPercent) || 10]} onValueChange={(v) => setBankManagementDailyStopPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} className="py-1" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
                    <ScrollArea className="h-[180px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
                                <TableRow className="hover:bg-transparent border-b border-white/10">
                                    <TableHead className="w-[35px] px-2 py-1.5 text-[8px] font-black uppercase text-slate-400">Dia</TableHead>
                                    <TableHead className="px-2 py-1.5 text-[8px] font-black uppercase text-center text-slate-400">Inicial</TableHead>
                                    <TableHead className="px-2 py-1.5 text-[8px] font-black uppercase text-center text-green-400">Meta</TableHead>
                                    <TableHead className="px-2 py-1.5 text-[8px] font-black uppercase text-right text-slate-400">Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.length > 0 ? plan.map(p => (
                                    <TableRow key={p.day} className={cn(
                                        "hover:bg-white/5 border-b border-white/5",
                                        p.day === bankManagementCurrentDay && "bg-primary/10 border-l-2 border-primary",
                                        p.isReal && p.status === 'win' && "bg-emerald-500/5",
                                        p.isReal && p.status === 'loss' && "bg-rose-500/5"
                                    )}>
                                        <TableCell className="px-2 py-2 text-[9px] font-bold flex items-center gap-1">
                                            {p.day}
                                            {p.isReal && (
                                                <span className={cn(
                                                    "h-1.5 w-1.5 rounded-full",
                                                    p.status === 'win' ? "bg-emerald-400" : "bg-rose-400"
                                                )} />
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-[9px] text-center font-medium">${p.initialBankroll.toFixed(2)}</TableCell>
                                        <TableCell className="px-2 py-2 text-[9px] text-center font-black text-green-400">
                                            {p.isReal && p.realProfit !== undefined ? (
                                                <span className={p.status === 'win' ? "text-emerald-400" : "text-rose-400"}>
                                                    {p.realProfit > 0 ? '+' : ''}${p.realProfit.toFixed(2)}
                                                </span>
                                            ) : (
                                                `$${p.goalValue.toFixed(2)}`
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-[9px] text-right font-bold text-primary">${p.projectedEndBankroll.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-16 text-center text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
                                            Aguardando dados...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter className="p-0 pt-4 flex flex-col gap-2 border-t border-white/10 mt-4">
                <div className="w-full flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Status Dia {bankManagementCurrentDay}</p>
                    <div className="flex gap-1">
                        <Button onClick={handleGoalMet} size="sm" className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-[8px] font-bold uppercase rounded-lg">
                            <ThumbsUp className="h-3 w-3 mr-1" /> Meta
                        </Button>
                        <Button onClick={handleStopLossHit} size="sm" variant="destructive" className="h-7 px-2.5 text-[8px] font-bold uppercase rounded-lg">
                            <ThumbsDown className="h-3 w-3 mr-1" /> Stop
                        </Button>
                    </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                    <Button onClick={handleResetPlan} variant="outline" size="sm" className="h-8 text-[8px] font-bold uppercase rounded-lg border-white/10 hover:bg-white/5">
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                    <Button onClick={handleApplyToBot} size="sm" className="h-8 text-[8px] font-bold uppercase rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950">
                        <Target className="h-3 w-3 mr-1" /> Aplicar Meta
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};