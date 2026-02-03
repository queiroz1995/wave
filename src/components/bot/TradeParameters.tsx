"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { toast } from "sonner";
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_ASSETS } from '@/hooks/bot/useBotState';

export const TradeParameters = () => {
    const {
        setDuration, setInitialStake,
        isManualMode, setIsManualMode,
        isManualGaleActive, setIsManualGaleActive,
        digitTradeMode, setDigitTradeMode,
        overUnderDirection, setOverUnderDirection,
        asset, setAsset,
    } = useBotContext();

    const resetParams = () => {
        setDuration(1);
        setInitialStake('0.35');
        toast.info("Parâmetros resetados.");
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-bold">
                    <Settings className="h-4 w-4" />Parâmetros de Operação
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetParams}><RotateCcw className="h-3 w-3" /></Button>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Ativo</Label>
                        <Select value={asset} onValueChange={setAsset}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_ASSETS.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={digitTradeMode} onValueChange={(v) => setDigitTradeMode(v as 'evenOdd' | 'overUnder')}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="evenOdd">Par/Ímpar</SelectItem>
                                <SelectItem value="overUnder">Acima/Abaixo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {digitTradeMode === 'overUnder' && (
                    <div className="space-y-2 pt-2">
                        <Label className="text-xs">Direção Alvo</Label>
                        <Select value={overUnderDirection} onValueChange={(v) => setOverUnderDirection(v as 'OVER' | 'UNDER')}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OVER">Acima</SelectItem>
                                <SelectItem value="UNDER">Abaixo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Modo Manual</Label>
                        <p className="text-[10px] text-muted-foreground">Habilita botões de compra rápida.</p>
                    </div>
                    <Switch checked={isManualMode} onCheckedChange={setIsManualMode} />
                </div>
            </CardContent>
        </Card>
    );
};