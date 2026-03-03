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
    { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
    { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
    { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
    { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
    { value: 'R_10', label: 'Volatility 10 Index' },
    { value: 'R_25', label: 'Volatility 25 Index' },
    { value: 'R_50', label: 'Volatility 50 Index' },
    { value: 'R_75', label: 'Volatility 75 Index' },
    { value: 'R_100', label: 'Volatility 100 Index' },
];

export const TradeParameters = () => {
    const {
        asset, setAsset,
        setDuration, setInitialStake,
        isManualMode, setIsManualMode,
        isManualGaleActive, setIsManualGaleActive,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
        isBotRunning
    } = useBotContext();

    const resetParams = () => {
        setDuration(1);
        setInitialStake('0.35');
        toast.info("Parâmetros de trade (Stake e Duração) foram resetados para o padrão.");
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

    useEffect(() => {
        if (digitTradeMode === 'overUnder') {
            if (overUnderDirection === 'OVER' && digitPrediction === 9) {
                setDigitPrediction(8);
            } else if (overUnderDirection === 'UNDER' && digitPrediction === 0) {
                setDigitPrediction(1);
            }
        }
    }, [overUnderDirection, digitPrediction, digitTradeMode, setDigitPrediction]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary"><Settings className="h-5 w-5" />Parâmetros de Trade</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetParams}><RotateCcw className="h-4 w-4" /><span className="sr-only">Resetar</span></Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Label>Ativo em Operação</Label>
                        <InfoTooltip infoText="Escolha o índice de volatilidade para operar. Cada índice tem uma velocidade de ticks diferente." />
                    </div>
                    <Select value={asset} onValueChange={handleAssetChange} disabled={isBotRunning}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um mercado" />
                        </SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_ASSETS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                    {a.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
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
                            <Label>Direção da Operação</Label>
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
                                <Label htmlFor="digit-prediction">Dígito Alvo (Barreira)</Label>
                                <span className="font-bold text-primary">{digitPrediction}</span>
                            </div>
                            <Slider
                                id="digit-prediction"
                                value={[digitPrediction]}
                                onValueChange={(val) => setDigitPrediction(val[0])}
                                min={digitPredictionMin}
                                max={digitPredictionMax}
                                step={1}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="manual-mode-switch" className="font-semibold">Habilitar Entradas Manuais</Label>
                        <Switch
                            id="manual-mode-switch"
                            checked={isManualMode}
                            onCheckedChange={setIsManualMode}
                        />
                    </div>
                </div>

                {isManualMode && (
                    <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="manual-gale-switch" className="font-semibold">Habilitar Martingale Manual</Label>
                            <Switch
                                id="manual-gale-switch"
                                checked={isManualGaleActive}
                                onCheckedChange={setIsManualGaleActive}
                            />
                        </div>
                    </div>
                )}
                
            </CardContent>
        </Card>
    );
};