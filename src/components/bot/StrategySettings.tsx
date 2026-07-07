"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Activity } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export const StrategySettings = () => {
    const {
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
        marketStabilityThreshold, setMarketStabilityThreshold
    } = useBotContext();

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
                    <BrainCircuit className="h-6 w-6" /> Ajustes I.A WAVE
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-8">
                <div className="p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold uppercase tracking-tight">Filtro de Tendência</Label>
                                <p className="text-[10px] text-muted-foreground">Evita entradas em sequências muito longas.</p>
                            </div>
                        </div>
                        <Switch checked={isStreakFilterActive} onCheckedChange={setIsStreakFilterActive} />
                    </div>
                    {isStreakFilterActive && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <Label>Sequência Máxima</Label>
                                <span className="font-black text-primary">{maxStreakAllowed}x</span>
                            </div>
                            <Slider value={[maxStreakAllowed]} onValueChange={(val) => setMaxStreakAllowed(val[0])} min={1} max={5} step={1} />
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-6 border-t">
                    <div className="flex items-center justify-between text-xs">
                        <Label className="uppercase font-bold text-muted-foreground">Dominância de Mercado (%)</Label>
                        <span className="font-black text-primary">{marketStabilityThreshold}%</span>
                    </div>
                    <Slider value={[Number(marketStabilityThreshold)]} onValueChange={(val) => setMarketStabilityThreshold(val[0].toString())} min={0} max={100} step={1}/>
                </div>
                
                <p className="text-[10px] text-center text-muted-foreground italic">
                    O motor Vortex Hunter está operando no núcleo da I.A WAVE.
                </p>
            </CardContent>
        </Card>
    );
};