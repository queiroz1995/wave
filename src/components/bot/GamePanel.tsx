"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ShieldAlert, Trophy, Activity, History, Zap } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';

export const GamePanel: React.FC = () => {
    const {
        initialStake, setInitialStake,
        toggleBot, isBotRunning,
        isConnected,
        manualBuy,
        isManualMode,
        currentSignal,
        isManualGaleActive,
        manualGaleLevel,
        martingaleFactor,
        digitTradeMode,
        digitPrediction,
        totalProfit,
        lastDigits,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        marketPulse,
    } = useBotContext();

    // CÁLCULO DE SEQUÊNCIAS E MAPA DE 16 DÍGITOS
    const streakData = useMemo(() => {
        const digits = (lastDigits || []).slice(0, 100);
        const last16 = (lastDigits || []).slice(0, 16);

        if (digits.length === 0) return { maxE: 0, maxO: 0, actC: 0, actT: null, last16: [] };

        let maxE = 0; let maxO = 0; let curC = 0; let curT: 'E' | 'O' | null = null;

        digits.forEach((d) => {
            const t = d % 2 === 0 ? 'E' : 'O';
            if (t === curT) { curC++; } 
            else {
                if (curT === 'E') maxE = Math.max(maxE, curC);
                if (curT === 'O') maxO = Math.max(maxO, curC);
                curT = t; curC = 1;
            }
        });
        if (curT === 'E') maxE = Math.max(maxE, curC);
        if (curT === 'O') maxO = Math.max(maxO, curC);

        let actC = 1; const actT = digits[0] % 2 === 0 ? 'E' : 'O';
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0 ? 'E' : 'O') === actT) actC++;
            else break;
        }

        return { maxE, maxO, actC, actT, last16 };
    }, [lastDigits]);

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
    
    const pulseConfig = {
        calm: { label: 'CALMO', color: 'text-blue-500', bg: 'bg-blue-500/20' },
        stable: { label: 'ESTÁVEL', color: 'text-green-500', bg: 'bg-green-500/20' },
        aggressive: { label: 'AGRESSIVO', color: 'text-red-500', bg: 'bg-red-500/20' },
    }[marketPulse as 'calm' | 'stable' | 'aggressive'] || { label: '...', color: 'text-muted-foreground', bg: 'bg-muted' };

    return (
        <Card className="bg-card/80 backdrop-blur-sm relative overflow-hidden">
            {/* Barra de Ritmo no Topo */}
            <div className={cn("absolute top-0 left-0 w-full h-1 transition-colors duration-500", pulseConfig.bg.replace('/20', ''))} />
            
            <CardContent className="pt-4 space-y-3">
                {/* Header do Painel */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Activity className={cn("h-4 w-4", pulseConfig.color)} />
                        <span className={cn("text-[10px] font-bold uppercase", pulseConfig.color)}>Ritmo: {pulseConfig.label}</span>
                    </div>
                </div>

                {/* MINI MAPA DE DÍGITOS (16) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-500" /> Mini Mapa Sniper (16)
                        </span>
                        <span className="text-[9px] text-muted-foreground italic">Esquerda = Recente</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                        {streakData.last16.map((digit, i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "h-6 flex items-center justify-center text-[10px] font-black text-white rounded-[4px] border border-white/5",
                                    digit % 2 === 0 ? (digit === 0 ? "bg-blue-600" : "bg-green-600") : "bg-red-600",
                                    i === 0 && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                )}
                            >
                                {digit}
                            </div>
                        ))}
                        {Array.from({ length: 16 - streakData.last16.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-6 bg-muted/20 border border-dashed rounded-[4px]" />
                        ))}
                    </div>
                </div>

                {/* Inputs Rápidos */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="initialStake" className="text-sm">Stake ($)</Label>
                            <span className={cn('text-xs font-bold', totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : '')}>
                                ${totalProfit.toFixed(2)}
                            </span>
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

                {/* Área de Trade Manual / Sinal */}
                {isManualMode && (
                    <div className="space-y-2 pt-2 border-t">
                        {/* Status de Sequência */}
                        <div className="flex justify-between items-center bg-muted/30 p-1.5 rounded-md border border-border/50">
                            <div className="flex gap-2">
                                <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-500 border-green-500/20">Max E: {streakData.maxE}x</Badge>
                                <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20">Max O: {streakData.maxO}x</Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">Atual:</span>
                                <span className={cn(
                                    "text-xs font-black",
                                    streakData.actT === 'E' ? "text-green-500" : "text-red-500"
                                )}>
                                    {streakData.actC}x {streakData.actT === 'E' ? 'P' : 'I'}
                                </span>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch">
                            {/* Bloco de Sinal */}
                            <div className={cn("p-2 rounded-lg border text-center transition-all h-full flex flex-col justify-center", signalBg)}>
                                <p className="text-[10px] text-muted-foreground">SINAL IA</p>
                                <p className={cn("text-base font-extrabold tracking-wider", signalColor)}>{signalText}</p>
                            </div>
                            
                            {/* Botões de Compra */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITEVEN' : 'DIGITOVER', 'Manual')}
                                    disabled={!isConnected}
                                    className="h-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold flex-col"
                                >
                                    <span className="text-xs uppercase">{digitTradeMode === 'evenOdd' ? 'PAR' : 'ACIMA'}</span>
                                    <span className="text-[9px] font-normal opacity-80">${nextManualStake.toFixed(2)}</span>
                                </Button>
                                <Button 
                                    onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITODD' : 'DIGITUNDER', 'Manual')}
                                    disabled={!isConnected}
                                    className="h-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold flex-col"
                                >
                                    <span className="text-xs uppercase">{digitTradeMode === 'evenOdd' ? 'ÍMPAR' : 'ABAIXO'}</span>
                                    <span className="text-[9px] font-normal opacity-80">${nextManualStake.toFixed(2)}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Botão de Controle Principal */}
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