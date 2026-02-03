"use client";

import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw, Activity } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { toast } from "sonner";
import { Switch } from '@/components/ui/switch';
import { InfoTooltip } from '../InfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { AVAILABLE_ASSETS } from '@/hooks/bot/useBotState';

export const TradeParameters = () => {
    const {
        setDuration, setInitialStake,
        isManualMode, setIsManualMode,
        isManualGaleActive, setIsManualGaleActive,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
        asset, setAsset,
        maxMarketSpeed, setMaxMarketSpeed,
    } = useBotContext();

    const resetParams = () => {
        setDuration(1);
        setInitialStake('0.35');
        toast.info("Parâmetros de trade resetados.");
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary"><Settings className="h-5 w-5" />Parâmetros de Trade</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetParams}><RotateCcw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Ativo Financeiro</Label>
                    <Select value={asset} onValueChange={setAsset}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_ASSETS.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Nota: Índices sem (1s) atualizam a cada 2 segundos (mais lentos).</p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-1.5">Sensibilidade Sniper (s) <Activity className="h-3 w-3 text-primary" /></Label>
                        <span className="font-bold text-primary">{maxMarketSpeed.toFixed(1)}s</span>
                    </div>
                    <Slider 
                        value={[maxMarketSpeed]} 
                        onValueChange={(v) => setMaxMarketSpeed(v[0])} 
                        min={0.5} 
                        max={3.0} 
                        step={0.1} 
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        O Sniper só autoriza entradas manuais se o intervalo entre ticks for maior que {maxMarketSpeed}s.
                    </p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <Label>Tipo de Operação</Label>
                    <Select value={digitTradeMode} onValueChange={(v) => setDigitTradeMode(v as 'evenOdd' | 'overUnder')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="evenOdd">Dígitos (Par/Ímpar)</SelectItem>
                            <SelectItem value="overUnder">Dígitos (Acima/Abaixo)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {digitTradeMode === 'overUnder' && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label>Direção</Label>
                            <Select value={overUnderDirection} onValueChange={(v) => setOverUnderDirection(v as 'OVER' | 'UNDER')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OVER">Acima</SelectItem>
                                    <SelectItem value="UNDER">Abaixo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                
                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Entradas Manuais</Label>
                        <Switch checked={isManualMode} onCheckedChange={setIsManualMode} />
                    </div>
                </div>

                {isManualMode && (
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Martingale Manual</Label>
                        <Switch checked={isManualGaleActive} onCheckedChange={setIsManualGaleActive} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};