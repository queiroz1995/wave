"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Target, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
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
    } = useBotContext();

    const plan: DayPlan[] = useMemo(() => {
        const goalPercent = parseFloat(bankManagementDailyGoalPercent) / 100 || 0;
        const stopPercent = parseFloat(bankManagementDailyStopPercent) / 100 || 0;
        const startBankroll = parseFloat(bankManagementActualBankroll) || 0;

        if (startBankroll <= 0 || goalPercent <= 0 || stopPercent <= 0) return [];

        const dailyPlans: DayPlan[] = [];
        let currentBankroll = startBankroll;

        for (let i = 0; i < 30; i++) {
            const dayNumber = bankManagementCurrentDay + i;
            const goalValue = currentBankroll * goalPercent;
            const stopValue = currentBankroll * stopPercent;
            const projectedEndBankroll = currentBankroll + goalValue;

            dailyPlans.push({ day: dayNumber, initialBankroll: currentBankroll, goalValue, stopValue, projectedEndBankroll });
            currentBankroll = projectedEndBankroll;
        }
        return dailyPlans;
    }, [bankManagementDailyGoalPercent, bankManagementDailyStopPercent, bankManagementCurrentDay, bankManagementActualBankroll]);

    const handleApplyToBot = () => {
        if (plan.length > 0) {
            const currentDayPlan = plan[0];
            setTakeProfit(currentDayPlan.goalValue.toFixed(2));
            setStopLoss(currentDayPlan.stopValue.toFixed(2));
            toast.success(`Metas do Dia ${currentDayPlan.day} aplicadas ao bot!`, {
                description: `Take Profit: $${currentDayPlan.goalValue.toFixed(2)} | Stop Loss: $${currentDayPlan.stopValue.toFixed(2)}`,
            });
        } else {
            toast.error("Preencha os valores para gerar um plano antes de aplicar.");
        }
    };

    const handleGoalMet = () => {
        if (plan.length > 0) {
            const currentDayPlan = plan[0];
            setBankManagementActualBankroll(currentDayPlan.projectedEndBankroll.toFixed(2));
            setBankManagementCurrentDay(bankManagementCurrentDay + 1);
            toast.success(`Parabéns! Dia ${currentDayPlan.day} concluído com sucesso.`, {
                description: `Novo saldo: $${currentDayPlan.projectedEndBankroll.toFixed(2)}. Preparando para o Dia ${currentDayPlan.day + 1}.`
            });
        }
    };

    const handleStopLossHit = () => {
        if (plan.length > 0) {
            const currentDayPlan = plan[0];
            const newBankroll = currentDayPlan.initialBankroll - currentDayPlan.stopValue;
            setBankManagementActualBankroll(newBankroll.toFixed(2));
            setBankManagementCurrentDay(bankManagementCurrentDay + 1);
            toast.info(`Dia ${currentDayPlan.day} finalizado em stop.`, {
                description: `Novo saldo: $${newBankroll.toFixed(2)}. Mantenha o foco para o Dia ${currentDayPlan.day + 1}.`
            });
        }
    };

    const handleResetPlan = () => {
        setBankManagementCurrentDay(1);
        setBankManagementActualBankroll(bankManagementInitialBankroll);
        toast.info("Gerenciamento de banca resetado para o Dia 1.");
    };

    return (
        <Card className="border-none shadow-none bg-transparent sm:bg-card sm:border sm:shadow-sm">
            <CardHeader className="px-4 py-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-primary text-lg sm:text-xl">
                    <DollarSign className="h-5 w-5" />Gerenciamento
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-sm">Planeje e acompanhe seu progresso diário.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-2 space-y-4 sm:space-y-6 sm:p-6">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="initial-bankroll" className="text-xs font-bold uppercase tracking-wider opacity-60">Banca Inicial ($)</Label>
                        <Input
                            id="initial-bankroll"
                            value={bankManagementInitialBankroll}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*[,.]?\d*$/.test(value)) {
                                    setBankManagementInitialBankroll(value.replace(',', '.'));
                                }
                            }}
                            placeholder="Ex: 100.00"
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold uppercase opacity-60">Meta (%)</Label>
                                <span className="text-xs font-black text-primary">{(parseFloat(bankManagementDailyGoalPercent) || 5).toFixed(1)}%</span>
                            </div>
                            <Slider value={[parseFloat(bankManagementDailyGoalPercent) || 5]} onValueChange={(v) => setBankManagementDailyGoalPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} className="py-2" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold uppercase opacity-60">Stop (%)</Label>
                                <span className="text-xs font-black text-primary">{(parseFloat(bankManagementDailyStopPercent) || 10).toFixed(1)}%</span>
                            </div>
                            <Slider value={[parseFloat(bankManagementDailyStopPercent) || 10]} onValueChange={(v) => setBankManagementDailyStopPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} className="py-2" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white/50 overflow-hidden">
                    <ScrollArea className="h-[250px] sm:h-[350px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10">
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="w-[40px] px-2 py-2 text-[9px] font-black uppercase">Dia</TableHead>
                                    <TableHead className="px-2 py-2 text-[9px] font-black uppercase text-center">Inicial</TableHead>
                                    <TableHead className="px-2 py-2 text-[9px] font-black uppercase text-center text-green-600">Meta</TableHead>
                                    <TableHead className="px-2 py-2 text-[9px] font-black uppercase text-right">Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.length > 0 ? plan.map(p => (
                                    <TableRow key={p.day} className={cn(
                                        "hover:bg-gray-50/50",
                                        p.day === bankManagementCurrentDay && "bg-primary/5 border-l-4 border-primary"
                                    )}>
                                        <TableCell className="px-2 py-2.5 text-[10px] font-bold">{p.day}</TableCell>
                                        <TableCell className="px-2 py-2.5 text-[10px] text-center font-medium">${p.initialBankroll.toFixed(2)}</TableCell>
                                        <TableCell className="px-2 py-2.5 text-[10px] text-center font-black text-green-600">${p.goalValue.toFixed(2)}</TableCell>
                                        <TableCell className="px-2 py-2.5 text-[10px] text-right font-bold text-primary">${p.projectedEndBankroll.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
                                            Aguardando dados...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter className="px-4 py-4 flex flex-col gap-3 border-t sm:p-6 bg-gray-50/30">
                <div className="w-full flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-tighter">Status Dia {bankManagementCurrentDay}</p>
                    <div className="flex gap-1.5">
                        <Button onClick={handleGoalMet} size="sm" className="h-8 px-3 bg-green-600 hover:bg-green-700 text-[10px] font-bold uppercase">
                            <ThumbsUp className="h-3 w-3 mr-1" /> Meta
                        </Button>
                        <Button onClick={handleStopLossHit} size="sm" variant="destructive" className="h-8 px-3 text-[10px] font-bold uppercase">
                            <ThumbsDown className="h-3 w-3 mr-1" /> Stop
                        </Button>
                    </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                    <Button onClick={handleResetPlan} variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase">
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                    <Button onClick={handleApplyToBot} size="sm" className="h-9 text-[10px] font-bold uppercase">
                        <Target className="h-3 w-3 mr-1" /> Aplicar Meta
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};