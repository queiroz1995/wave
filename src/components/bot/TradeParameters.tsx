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

export const TradeParameters = () => {
    const {
        setDuration, setInitialStake,
        isManualMode, setIsManualMode,
        isManualGaleActive, setIsManualGaleActive,
        digitTradeMode, setDigitTradeMode,
        digitPrediction, setDigitPrediction,
        overUnderDirection, setOverUnderDirection,
    } = useBotContext();

    const resetParams = () => {
        setDuration(1);
        setInitialStake('0.35');
        toast.info("Parâmetros de trade (Stake e Duração) foram resetados para o padrão.");
    };

    // Determine min/max for digitPrediction slider based on overUnderDirection
    // OVER: Barreira pode ser 0 a 8. (Acima de 9 é impossível)
    // UNDER: Barreira pode ser 1 a 9. (Abaixo de 0 é impossível)
    const digitPredictionMin = overUnderDirection === 'OVER' ? 0 : 1;
    const digitPredictionMax = overUnderDirection === 'OVER' ? 8 : 9;

    // Effect to adjust digitPrediction if it becomes invalid after changing overUnderDirection
    useEffect(() => {
        if (digitTradeMode === 'overUnder') {
            if (overUnderDirection === 'OVER' && digitPrediction === 9) {
                setDigitPrediction(8);
                toast.info("Dígito Alvo ajustado para 8 (máximo para 'Acima').");
            } else if (overUnderDirection === 'UNDER' && digitPrediction === 0) {
                setDigitPrediction(1);
                toast.info("Dígito Alvo ajustado para 1 (mínimo para 'Abaixo').");
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
                            <InfoTooltip 
                                infoText={
                                    overUnderDirection === 'OVER' 
                                        ? `Aposta em dígitos MAIORES que a barreira. Se a barreira for ${digitPrediction}, você ganha com ${digitPrediction + 1} a 9. Você perde com ${digitPrediction} ou menos.`
                                        : `Aposta em dígitos MENORES que a barreira. Se a barreira for ${digitPrediction}, você ganha com ${digitPrediction - 1} a 0. Você perde com ${digitPrediction} ou mais.`
                                } 
                            />
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Label>Ativo em Operação</Label>
                        <InfoTooltip infoText="O bot está configurado para operar exclusivamente no Índice de Volatilidade 100 (1s)." />
                    </div>
                    <Input value="Volatility 100 (1s)" disabled />
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="manual-mode-switch" className="font-semibold">Habilitar Entradas Manuais</Label>
                        <Switch
                            id="manual-mode-switch"
                            checked={isManualMode}
                            onCheckedChange={setIsManualMode}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Quando desativado, os botões de compra manual (Par/Ímpar) serão ocultados.
                    </p>
                </div>

                {isManualMode && (
                    <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="manual-gale-switch" className="font-semibold">Habilitar Martingale Manual</Label>
                                <InfoTooltip infoText="Se ativo, após uma perda manual, a próxima aposta manual terá o valor de Martingale calculado automaticamente." />
                            </div>
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