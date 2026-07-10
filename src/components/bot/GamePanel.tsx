"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Target, X } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const GamePanel: React.FC = () => {
    const {
        asset,
        initialStake, setInitialStake,
        duration, setDuration,
        toggleBot, isBotRunning,
        isConnected,
        manualBuy,
        isManualMode,
        currentSignal,
        currentSignalDetails,
        digitPrediction,
        totalProfit,
    } = useBotContext();

    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInitialStake(e.target.value.replace(',', '.'));
    };

    const isForex = asset?.startsWith('frx');
    const signalText = currentSignal === 'DIGITEVEN' ? (isForex ? 'SOBE' : 'PAR') :
                       currentSignal === 'DIGITODD' ? (isForex ? 'DESCE' : 'ÍMPAR') :
                       currentSignal === 'DIGITOVER' ? `ACIMA ${digitPrediction}` :
                       currentSignal === 'DIGITUNDER' ? `ABAIXO ${digitPrediction}` :
                       'AGUARDANDO';

    const isUpSignal = currentSignal === 'DIGITEVEN' || currentSignal === 'DIGITOVER';
    const isDownSignal = currentSignal === 'DIGITODD' || currentSignal === 'DIGITUNDER';

    const signalColor = isUpSignal ? 'text-green-500' : isDownSignal ? 'text-red-500' : 'text-muted-foreground';
    const signalBg = currentSignal ? (isUpSignal ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30') : 'bg-muted/50 border-border';
    
    const strategyName = currentSignalDetails?.strategyName;

    const automationDisabled = !isConnected;

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="initialStake" className="text-sm">Stake ($)</Label>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="text-right">
                                    <span className="text-muted-foreground">Lucro: </span>
                                    <span className={cn('font-bold', totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : '')}>
                                        ${totalProfit.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="relative flex items-center">
                            <Input 
                                id="initialStake" 
                                value={initialStake} 
                                onChange={handleStakeChange} 
                                className="text-center text-base font-bold h-9 pr-8 w-full"
                                placeholder="0.35"
                            />
                            {initialStake !== "" && (
                                <button 
                                    type="button"
                                    onClick={() => setInitialStake("")}
                                    className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="duration" className="text-sm">Duração (Ticks)</Label>
                        <span className="font-bold text-primary text-sm">{duration}</span>
                    </div>
                    <Slider 
                        id="duration" 
                        value={[duration]} 
                        onValueChange={(val) => setDuration(val[0])} 
                        min={1} 
                        max={10} 
                        step={1}
                    />
                </div>
                
                {isManualMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch">
                        <div className={cn("p-2 rounded-lg border text-center transition-all h-full flex flex-col justify-center", signalBg)}>
                            <p className="text-xs text-muted-foreground">SINAL ATUAL</p>
                            <p className={cn("text-base font-extrabold tracking-wider", signalColor)}>{signalText}</p>
                            
                            {currentSignal && strategyName && (
                                <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px]">
                                    <Target className="h-2.5 w-2.5 text-primary" />
                                    <span className="font-semibold text-foreground truncate">{strategyName.replace('Padrão: ', '').replace('Analisador: ', '')}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                onClick={() => manualBuy('DIGITEVEN', 'Manual')}
                                disabled={!isConnected}
                                className="h-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex-col"
                            >
                                <span>{isForex ? 'SOBE' : 'PAR'}</span>
                            </Button>
                            <Button 
                                onClick={() => manualBuy('DIGITODD', 'Manual')}
                                disabled={!isConnected}
                                className="h-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex-col"
                            >
                                <span>{isForex ? 'DESCE' : 'ÍMPAR'}</span>
                            </Button>
                        </div>
                    </div>
                )}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full">
                                <Button 
                                    onClick={toggleBot} 
                                    disabled={automationDisabled}
                                    size="sm" 
                                    className={cn(
                                        "w-full transition-all text-sm h-9", 
                                        isBotRunning 
                                            ? "bg-red-500 hover:bg-red-600" 
                                            : "bg-primary hover:bg-primary/90 animate-pulse-bright",
                                        automationDisabled && "cursor-not-allowed"
                                    )}
                                >
                                    {isBotRunning ? 'Parar Automação' : 'Iniciar Automação'}
                                </Button>
                            </div>
                        </TooltipTrigger>
                        {automationDisabled && (
                             <TooltipContent>
                                <p>Conecte-se à sua conta para iniciar a automação.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
};