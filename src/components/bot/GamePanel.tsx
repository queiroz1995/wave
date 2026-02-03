"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Activity, Plus, Minus, ChevronDown } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_ASSETS } from '@/hooks/bot/useBotState';

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
        digitTradeMode, setDigitTradeMode,
        digitPrediction,
        overUnderDirection, setOverUnderDirection,
        asset, setAsset,
        totalProfit,
        lastDigits,
        virtualTargetLosses, setVirtualTargetLosses,
        virtualTargetWins, setVirtualTargetWins,
        marketPulse,
    } = useBotContext();

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
        
        let actC = 1; const actT = digits[0] % 2 === 0 ? 'E' : 'O';
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0 ? 'E' : 'O') === actT) actC++;
            else break;
        }
        return { maxE, maxO, actC, actT, last16 };
    }, [lastDigits]);

    const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.');
        if (/^\d*\.?\d*$/.test(val)) {
            setInitialStake(val);
        }
    };

    const adjustStake = (amount: number) => {
        const current = parseFloat(initialStake) || 0;
        const next = Math.max(0.35, current + amount);
        setInitialStake(next.toFixed(2));
    };

    const currentActiveStake = useMemo(() => {
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
            <div className={cn("absolute top-0 left-0 w-full h-1 transition-colors duration-500", pulseConfig.bg.replace('/20', ''))} />
            <CardContent className="pt-4 space-y-4">
                
                {/* Seletores Rápidos de Ativo e Modo */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase">Ativo</Label>
                        <Select value={asset} onValueChange={setAsset}>
                            <SelectTrigger className="h-8 text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_ASSETS.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase">Modo</Label>
                        <Select value={digitTradeMode} onValueChange={(v) => setDigitTradeMode(v as 'evenOdd' | 'overUnder')}>
                            <SelectTrigger className="h-8 text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="evenOdd">Par/Ímpar</SelectItem>
                                <SelectItem value="overUnder">Acima/Abaixo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Activity className={cn("h-4 w-4", pulseConfig.color)} />
                        <span className={cn("text-[10px] font-bold uppercase", pulseConfig.color)}>Ritmo: {pulseConfig.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground">LUCRO:</span>
                        <span className={cn('text-xs font-black', totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                            ${totalProfit.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-8 gap-1">
                    {streakData.last16.map((digit, i) => (
                        <div key={i} className={cn("h-6 flex items-center justify-center text-[10px] font-black text-white rounded-[4px]", digit % 2 === 0 ? (digit === 0 ? "bg-blue-600" : "bg-green-600") : "bg-red-600", i === 0 && "ring-2 ring-primary ring-offset-1")}>{digit}</div>
                    ))}
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Valor da Entrada (Stake)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(-1)}><Minus className="h-4 w-4" /></Button>
                        <Input 
                            value={initialStake} 
                            onChange={handleStakeChange} 
                            className="text-center text-xl font-black h-10 border-primary/40 bg-background/50" 
                        />
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => adjustStake(1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[0.35, 1, 5, 10].map(val => (
                            <Button key={val} variant="secondary" size="sm" className="h-8 text-[10px] font-extrabold" onClick={() => setInitialStake(val.toFixed(2))}>
                                ${val}
                            </Button>
                        ))}
                    </div>
                </div>

                {digitTradeMode === 'overUnder' && (
                    <div className="space-y-1.5 pt-2 border-t">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase">Direção Alvo (Acima/Abaixo)</Label>
                        <Select value={overUnderDirection} onValueChange={(v) => setOverUnderDirection(v as 'OVER' | 'UNDER')}>
                            <SelectTrigger className="h-8 text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OVER">Acima</SelectItem>
                                <SelectItem value="UNDER">Abaixo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Loss Virtual</Label>
                        <Input type="number" value={virtualTargetLosses} onChange={(e) => setVirtualTargetLosses(parseInt(e.target.value) || 0)} className="text-center text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Win Virtual</Label>
                        <Input type="number" value={virtualTargetWins} onChange={(e) => setVirtualTargetWins(parseInt(e.target.value) || 0)} className="text-center text-xs h-8" />
                    </div>
                </div>

                {isManualMode && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch">
                            <div className={cn("p-2 rounded-lg border text-center transition-all h-full flex flex-col justify-center", signalBg)}>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Sinal IA</p>
                                <p className={cn("text-sm font-black tracking-widest", signalColor)}>{signalText}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITEVEN' : 'DIGITOVER', 'Manual', currentActiveStake)} 
                                    disabled={!isConnected} 
                                    className="h-full py-2 bg-green-600 hover:bg-green-700 text-white font-black flex-col border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    <span className="text-xs">{digitTradeMode === 'evenOdd' ? 'PAR' : 'ACIMA'}</span>
                                    <span className="text-[9px] opacity-80">${currentActiveStake.toFixed(2)}</span>
                                </Button>
                                <Button 
                                    onClick={() => manualBuy(digitTradeMode === 'evenOdd' ? 'DIGITODD' : 'DIGITUNDER', 'Manual', currentActiveStake)} 
                                    disabled={!isConnected} 
                                    className="h-full py-2 bg-red-600 hover:bg-red-700 text-white font-black flex-col border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all"
                                >
                                    <span className="text-xs">{digitTradeMode === 'evenOdd' ? 'ÍMPAR' : 'ABAIXO'}</span>
                                    <span className="text-[9px] opacity-80">${currentActiveStake.toFixed(2)}</span>
                                </Button>
                            </div>
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
                                className={cn(
                                    "w-full transition-all text-xs font-bold h-10 uppercase tracking-widest", 
                                    isBotRunning ? "bg-yellow-600 hover:bg-yellow-700 shadow-[0_0_15px_rgba(202,138,4,0.3)]" : "bg-primary hover:bg-primary/90"
                                )}
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