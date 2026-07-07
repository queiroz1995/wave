"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StrategyPerformance } from '@/types/bot';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/InfoTooltip';

interface StrategySignalCardProps {
    strategy: StrategyPerformance;
    onActivate: (id: string) => void;
    isActive: boolean;
    currentSignal: 'EVEN' | 'ODD' | 'NONE';
    signalDetails: string;
}

export const StrategySignalCard: React.FC<StrategySignalCardProps> = ({ strategy, onActivate, isActive, currentSignal, signalDetails }) => {
    const winRateValue = parseFloat(strategy.winRate) || 0;
    const isHighWinRate = winRateValue >= 55;

    const signalStatus = currentSignal !== 'NONE' ? currentSignal : 'Aguardando Sinal';
    const signalColor = currentSignal === 'ODD' ? 'bg-red-500' : currentSignal === 'EVEN' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700';
    const signalTextColor = currentSignal === 'ODD' ? 'text-red-500' : currentSignal === 'EVEN' ? 'text-green-500' : 'text-foreground';

    return (
        <Card className={cn("transition-all", isActive && "border-primary/80 shadow-[0_0_10px_hsl(var(--primary)/0.3)]")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {strategy.name}
                </CardTitle>
                <Button 
                    variant={isActive ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => onActivate(strategy.id)}
                    className="h-7 text-xs"
                >
                    {isActive ? 'ATIVA' : 'ATIVAR'}
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Descrição</span>
                    <InfoTooltip infoText={strategy.description} />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium">
                    <div className="flex flex-col items-center">
                        <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {strategy.wins}</span>
                        <span className="text-xs text-muted-foreground">Vitórias</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> {strategy.losses}</span>
                        <span className="text-xs text-muted-foreground">Derrotas</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className={cn("font-bold", isHighWinRate ? "text-green-400" : "text-red-400")}>{strategy.winRate}</span>
                        <span className="text-xs text-muted-foreground">Assertividade</span>
                    </div>
                </div>

                <Progress
                    value={winRateValue}
                    className={cn(
                        "h-2",
                        isHighWinRate ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"
                    )}
                />

                <div className={cn("p-2 rounded-md text-center font-bold text-sm transition-colors", signalColor, signalTextColor)}>
                    {signalStatus}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                    {signalDetails}
                </p>
            </CardContent>
        </Card>
    );
};