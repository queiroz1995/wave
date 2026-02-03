"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Target, ShieldAlert, Trophy, Activity, Crosshair } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';

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
        martingaleFactor,
        digitTradeMode,
        digitPrediction,
        totalProfit,
        wins,
        losses,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        // NOVOS ESTADOS
        isManualSniperMode, setIsManualSniperMode,
        marketPulse,
    } = useBotContext();

    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInitialStake(e.target.value.replace(',', '.'));
    };

    const nextManualStake = useMemo(() => {
        const baseStake = parseFloat(initialStake) || 0.35;
        if (isManualGaleActive && manualGaleLevel > 0) {
            const mgFactor = parseFloat(martingaleFactor) || 2.2;
            return baseStake * Math.pow(mgFactor, manualGaleLevel);
        }
        return baseStake;
    }, [initialStake, isManualGaleActive, manualGaleLevel, martingaleFactor]);

    const signalText = currentSignal === 'DIGITEVEN' ? 'PAR' :
                       currentSignal === 'DIGITODD' ? 'ÍMPAR' :
                       currentSignal === 'DIGITOVER' ? `ACIMA ${digitPrediction}` :
                       currentSignal === 'DIGITUNDER' ? `ABAIXO ${digitPrediction}` :
                       'AGUARDANDO';

    const isUpSignal = currentSignal === 'DIGITEVEN' || currentSignal === 'DIGITOVER';
    const isDownSignal = currentSignal === 'DIGITODD' || currentSignal === 'DIGITUNDER';
    const signalColor = isUpSignal ? 'text-green-500' : isDownSignal ? 'text-red-500' : 'text-muted-foreground';
    const signalBg = currentSignal ? (isUpSignal ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30') : 'bg-muted/50 border-border';
    
    // Configurações do Pulso do Mercado
    const pulseConfig = {
        calm: { label: 'CALMO', color: 'text-blue-500', bg: 'bg-blue-500/20' },
        stable: { label: 'ESTÁVEL', color: 'text-green-500', bg: 'bg-green-500/20' },
        aggressive: { label: 'AGRESSIVO', color: 'text-red-500', bg: 'bg-red-500/20' },
    }[marketPulse as 'calm' | 'stable' | 'aggressive'] || { label: '...', color: 'text-muted-foreground', bg: 'bg-muted' };

    return (
        <Card className="bg-card/80 backdrop-blur-sm relative overflow-hidden">
            {/* Market Pulse Bar - INNOVATION */}
            <div className={cn("absolute top-0 left-0 w-full h-1 transition-colors duration-500", pulseConfig.bg.replace('/20', ''))} />
            
            <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Activity className={cn("h-4 w-4", pulseConfig.color)} />
                        <span className={cn("text-[10px] font-bold uppercase", pulseConfig.color)}>Ritmo: {pulseConfig.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold">Sniper Manual</span>
                        <Switch checked={isManualSniperMode} onCheckedChange={setIsManualSniperMode} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="initialStake" className="text-sm">Stake ($)</Label>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={cn('font-bold', totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : '')}>
                                    ${totalProfit.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <Input id="initialStake" value={initialStake} onChange={handleStakeChange} className="text-center text-sm font-bold h-9" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] flex items-center gap-0.5 truncate px-1">Loss <ShieldAlert className="h-2.5 w-2.5" /></Label>
                            <Input type="number" value={virtualTargetLosses} onChange={(e) => setVirtualTargetLosses(parseInt(e.target.value) || 0)} className="text-center text-xs h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] flex items-center gap-0.5 truncate px-1">Win <Trophy className="h-2.5 w-2.5" /></Label>
                            <Input type="number" value={virtualTargetWins} onChange={(e) => setVirtualTargetWins(parseInt(e.target.value) || 0)} className="text-center text-xs h-9" />
                        </div>
                    </div>
                </div>

                {isManualMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch pt-2 border-t">
                        <div className={cn("p-2 rounded-lg border text-center transition-all h-full flex flex-col justify-center", signalBg)}>
                            <p className="text-[10px] text-muted-foreground">SINAL IA</p>
                            <p className={cn("text-base font-extrabold tracking-wider", signalColor)}>{signalText}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITEVEN' : 'DIGITOVER', 'Manual Sniper')}
                                disabled={!isConnected || (isManualSniperMode && marketPulse === 'aggressive')}
                                className={cn(
                                    "h-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold flex-col",
                                    isManualSniperMode && marketPulse === 'aggressive' && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isManualSniperMode && <Crosshair className="h-3 w-3 mb-1" />}
                                <span className="text-xs uppercase">{digitTradeMode === 'evenOdd' ? 'PAR' : 'ACIMA'}</span>
                                <span className="text-[9px] font-normal opacity-80">${nextManualStake.toFixed(2)}</span>
                            </Button>
                            <Button 
                                onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITODD' : 'DIGITUNDER', 'Manual Sniper')}
                                disabled={!isConnected || (isManualSniperMode && marketPulse === 'aggressive')}
                                className={cn(
                                    "h-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold flex-col",
                                    isManualSniperMode && marketPulse === 'aggressive' && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isManualSniperMode && <Crosshair className="h-3 w-3 mb-1" />}
                                <span className="text-xs uppercase">{digitTradeMode === 'evenOdd' ? 'ÍMPAR' : 'ABAIXO'}</span>
                                <span className="text-[9px] font-normal opacity-80">${nextManualStake.toFixed(2)}</span>
                            </Button>
                        </div>
                    </div>
                )}
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                onClick={toggleBot} 
                                disabled={!isConnected}
                                size="sm" 
                                className={cn("w-full transition-all text-sm h-9", isBotRunning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-primary hover:bg-primary/90")}
                            >
                                {isBotRunning ? 'Parar Automação' : 'Iniciar Automação'}
                            </Button>
                        </TooltipTrigger>
                        {!isConnected && <TooltipContent><p>Conecte-se para operar.</p></TooltipContent>}
                    </Tooltip>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
};