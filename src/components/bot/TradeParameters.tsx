"use client";

import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { toast } from "sonner";
import { Switch } from '@/components/ui/switch';
import { InfoTooltip } from '../InfoTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';

const AVAILABLE_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
    { value: 'R_100', label: 'Volatility 100 Index' },
];

export const TradeParameters = () => {
    const {
        asset, setAsset,
        setDuration, setInitialStake,
        isManualMode, setIsManualMode,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
        isBotRunning
    } = useBotContext();

    const resetParams = () => {
        setDuration(3);
        setInitialStake('0.35');
        toast.info("Parâmetros de trade resetados.");
    };

    const handleAssetChange = (newAsset: string) => {
        if (isBotRunning) {
            toast.error("Pare o bot antes de trocar de mercado.");
            return;
        }
        setAsset(newAsset);
        const assetLabel = AVAILABLE_ASSETS.find(a => a.value === newAsset)?.label;
        toast.success(`Mercado alterado para: ${assetLabel}`);
    };

    const digitPredictionMin = overUnderDirection === 'OVER' ? 0 : 1;
    const digitPredictionMax = overUnderDirection === 'OVER' ? 8 : 9;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary"><Settings className="h-5 w-5" />Parâmetros de Trade</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetParams}><RotateCcw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Ativo em Operação</Label>
                    <Select value={asset} onValueChange={handleAssetChange} disabled={isBotRunning}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_ASSETS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Label>Modalidade Analítica</Label>
                        <InfoTooltip infoText="Multimodal permite que a I.A decida entre Par/Ímpar ou Sobe/Desce com base na oportunidade." />
                    </div>
                    <Select value={digitTradeMode} onValueChange={(v) => setDigitTradeMode(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="multimodal">Multi-Modal (I.A Decida)</SelectItem>
                            <SelectItem value="evenOdd">Apenas Dígitos (Par/Ímpar)</SelectItem>
                            <SelectItem value="riseFall">Apenas Longa/Sobe (Rise)</SelectItem>
                            <SelectItem value="overUnder">Apenas Dígitos (Acima/Abaixo)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {digitTradeMode === 'overUnder' && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label>Direção (Acima/Abaixo)</Label>
                            <Select value={overUnderDirection} onValueChange={(v) => setOverUnderDirection(v as 'OVER' | 'UNDER')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OVER">Acima (Over)</SelectItem>
                                    <SelectItem value="UNDER">Abaixo (Under)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Barreira</Label>
                                <span className="font-bold text-primary">{digitPrediction}</span>
                            </div>
                            <Slider value={[digitPrediction]} onValueChange={(val) => setDigitPrediction(val[0])} min={digitPredictionMin} max={digitPredictionMax} step={1} />
                        </div>
                    </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Habilitar Entradas Manuais</Label>
                        <Switch checked={isManualMode} onCheckedChange={setIsManualMode} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};