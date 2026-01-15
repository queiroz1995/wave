"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Timer, Target, ShieldAlert } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const GamePanel: React.FC = () => {
    const {
        initialStake, setInitialStake,
        duration, setDuration,
        toggleBot, isBotRunning,
        isConnected,
        manualBuy,
        isManualMode,
        currentSignal,
        currentSignalDetails,
        isManualGaleActive,
        manualGaleLevel,
        lossRecoveryStrategy,
        martingaleFactor,
        digitTradeMode,
        digitPrediction,
        totalProfit,
        wins,
        losses,
        // Novos estados do Loss Virtual
        virtualTargetLosses, setVirtualTargetLosses,
    } = useBotContext();

    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInitialStake(e.target.value.replace(',', '.'));
    };

    const handleVirtualLossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 0) {
            setVirtualTargetLosses(val);
        } else if (e.target.value === '') {
            setVirtualTargetLosses(0);
        }
    };

    const signalText = currentSignal === 'DIGITEVEN' ? 'PAR' :
                       currentSignal === 'DIGITODD' ? 'ÍMPAR' :
                       currentSignal === 'DIGITOVER' ? `ACIMA ${digitPrediction}` :
                       currentSignal === 'DIGITUNDER' ? `ABAIXO ${digitPrediction}` :
                       'AGUARDANDO';

    const isUpSignal = currentSignal === 'DIGITEVEN' || currentSignal === 'DIGITOVER';
    const isDownSignal = currentSignal === 'DIGITODD' || currentSignal === 'DIGITUNDER';

    const signalColor = isUpSignal ? 'text-green-500' : isDownSignal ? 'text-red-500' : 'text-muted-foreground';
    const signalBg = currentSignal ? (isUpSignal ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30') : 'bg-muted/50 border-border';
    
    const winRate = currentSignalDetails?.winRate;
    const strategyName = currentSignalDetails?.strategyName;

    const nextManualStake = useMemo(() => {
        const baseStake = parseFloat(initialStake) || 0.35;
        if (isManualGaleActive && manualGaleLevel > 0) {
            const mgFactor = parseFloat(martingaleFactor) || 2.2;
            return baseStake * Math.pow(mgFactor, manualGaleLevel);
        }
        return baseStake;
    }, [initialStake, isManualGaleActive, manualGaleLevel, martingaleFactor]);

    const automationDisabled = !isConnected;

    const totalTrades = wins + losses;
    const sessionWinRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
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
                        <Input 
                            id="initialStake" 
                            value={initialStake} 
                            onChange={handleStakeChange} 
                            className="text-center text-sm font-bold h-9"
                            placeholder="0.35"
                        />
                    </div>
                    
                    {/* NOVO CAMPO: LOSS VIRTUAL */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="virtualLoss" className="text-sm flex items-center gap-1">
                                Loss Virtual <ShieldAlert className="h-3 w-3 text-yellow-500" />
                            </Label>
                            <span className="text-[10px] text-muted-foreground">Meta</span>
                        </div>
                        <Input 
                            id="virtualLoss" 
                            type="number"
                            value={virtualTargetLosses} 
                            onChange={handleVirtualLossChange} 
                            className="text-center text-sm font-bold h-9"
                            min="0"
                        />
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
                        
                        {digitTradeMode === 'evenOdd' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => manualBuy('DIGITEVEN', 'Manual')}
                                    disabled={!isConnected}
                                    className="h-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex-col"
                                >
                                    <span>PAR</span>
                                    <span className="text-[9px] font-normal opacity-80">(${nextManualStake.toFixed(2)})</span>
                                </Button>
                                <Button 
                                    onClick={() => manualBuy('DIGITODD', 'Manual')}
                                    disabled={!isConnected}
                                    className="h-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex-col"
                                >
                                    <span>ÍMPAR</span>
                                    <span className="text-[9px] font-normal opacity-80">(${nextManualStake.toFixed(2)})</span>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => manualBuy('DIGITOVER', 'Manual')}
                                    disabled={!isConnected || digitPrediction === 9}
                                    className="h-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold flex-col gap-0.5"
                                >
                                    <span>ACIMA {digitPrediction}</span>
                                    <span className="text-[9px] font-normal opacity-80">(${nextManualStake.toFixed(2)})</span>
                                </Button>
                                <Button 
                                    onClick={() => manualBuy('DIGITUNDER', 'Manual')}
                                    disabled={!isConnected || digitPrediction === 0}
                                    className="h-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold flex-col gap-0.5"
                                >
                                    <span>ABAIXO {digitPrediction}</span>
                                    <span className="text-[9px] font-normal opacity-80">(${nextManualStake.toFixed(2)})</span>
                                </Button>
                            </div>
                        )}
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
                                            ? "bg-yellow-600 hover:bg-yellow-700" 
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