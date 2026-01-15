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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><DollarSign className="h-5 w-5" />Gerenciamento de Banca</CardTitle>
                <CardDescription>Planeje e acompanhe seu progresso diário. Suas configurações e progresso são salvos automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="initial-bankroll">Banca Inicial ($)</Label>
                        <Input
                            id="initial-bankroll"
                            value={bankManagementInitialBankroll}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and a single decimal point, replacing comma with dot
                                if (/^\d*[,.]?\d*$/.test(value)) {
                                    setBankManagementInitialBankroll(value.replace(',', '.'));
                                }
                            }}
                            placeholder="Ex: 100.00"
                            className="text-base"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="daily-goal">Meta Diária (%)</Label>
                            <span className="font-bold text-primary">{(parseFloat(bankManagementDailyGoalPercent) || 5).toFixed(1)}%</span>
                        </div>
                        <Slider id="daily-goal" value={[parseFloat(bankManagementDailyGoalPercent) || 5]} onValueChange={(v) => setBankManagementDailyGoalPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="daily-stop">Stop Diário (%)</Label>
                            <span className="font-bold text-primary">{(parseFloat(bankManagementDailyStopPercent) || 10).toFixed(1)}%</span>
                        </div>
                        <Slider id="daily-stop" value={[parseFloat(bankManagementDailyStopPercent) || 10]} onValueChange={(v) => setBankManagementDailyStopPercent(v[0].toFixed(1))} min={0.5} max={20} step={0.5} />
                    </div>
                </div>

                <ScrollArea className="h-[400px] border rounded-md"><Table><TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm"><TableRow>
                    <TableHead className="w-[50px] p-2 text-xs sm:text-sm">Dia</TableHead>
                    <TableHead className="p-2 text-xs sm:text-sm"><span className="sm:hidden">Inicial</span><span className="hidden sm:inline">Banca Inicial</span></TableHead>
                    <TableHead className="p-2 text-xs text-green-500 sm:text-sm"><span className="sm:hidden">Meta</span><span className="hidden sm:inline">Meta do Dia</span></TableHead>
                    <TableHead className="p-2 text-xs text-red-500 sm:text-sm"><span className="sm:hidden">Stop</span><span className="hidden sm:inline">Stop do Dia</span></TableHead>
                    <TableHead className="p-2 text-xs sm:text-sm text-right"><span className="sm:hidden">Final</span><span className="hidden sm:inline">Banca Final</span></TableHead>
                </TableRow></TableHeader><TableBody>
                    {plan.length > 0 ? plan.map(p => (
                        <TableRow key={p.day} className={cn(p.day === bankManagementCurrentDay && "bg-primary/10 border-l-4 border-primary")}>
                            <TableCell className="p-2 text-xs font-medium sm:text-sm">{p.day}</TableCell>
                            <TableCell className="p-2 text-xs sm:text-sm">${p.initialBankroll.toFixed(2)}</TableCell>
                            <TableCell className="p-2 text-xs font-semibold text-green-500 sm:text-sm">${p.goalValue.toFixed(2)}</TableCell>
                            <TableCell className="p-2 text-xs font-semibold text-red-500 sm:text-sm">${p.stopValue.toFixed(2)}</TableCell>
                            <TableCell className="p-2 text-xs sm:text-sm text-right">${p.projectedEndBankroll.toFixed(2)}</TableCell>
                        </TableRow>
                    )) : (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Preencha os campos acima para gerar seu plano.</TableCell></TableRow>)}
                </TableBody></Table></ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6 border-t">
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-lg font-bold">Controle do Dia {bankManagementCurrentDay}</p>
                    <div className="flex gap-2">
                        <Button onClick={handleGoalMet} className="bg-green-600 hover:bg-green-700"><ThumbsUp className="h-4 w-4 mr-2" />Meta Batida</Button>
                        <Button onClick={handleStopLossHit} variant="destructive"><ThumbsDown className="h-4 w-4 mr-2" />Stop Atingido</Button>
                    </div>
                </div>
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <Button onClick={handleResetPlan} variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-2" />Resetar Plano</Button>
                    <Button onClick={handleApplyToBot} size="lg" className="w-full sm:w-auto"><Target className="h-4 w-4 mr-2" />Aplicar Metas de Hoje</Button>
                </div>
            </CardFooter>
        </Card>
    );
};