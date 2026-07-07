"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { InfoTooltip } from '@/components/InfoTooltip';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export const RiskManagement = () => {
    const {
        martingaleFactor, setMartingaleFactor, maxLevels, setMaxLevels, 
        takeProfit, setTakeProfit, stopLoss, setStopLoss,
        lossRecoveryStrategy, setLossRecoveryStrategy,
        martingaleMode, setMartingaleMode,
        maxTrades, setMaxTrades,
        isSorosActive, setIsSorosActive,
        sorosLevels, setSorosLevels,
        sorosProfitPercentage, setSorosProfitPercentage,
        isMartingaleActive, setIsMartingaleActive,
    } = useBotContext();

    const handleProfitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*[,.]?\d*$/.test(value)) {
            setTakeProfit(value.replace(',', '.'));
        }
    };

    const handleStopLossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*[,.]?\d*$/.test(value)) {
            setStopLoss(value.replace(',', '.'));
        }
    };

    const handleMaxTradesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setMaxTrades(Number(value));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" />Gestão de Risco</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                        <Label>Estratégia de Recuperação</Label>
                        <InfoTooltip infoText="Define como o bot tentará recuperar perdas." />
                    </div>
                    <RadioGroup value={lossRecoveryStrategy} onValueChange={(v) => setLossRecoveryStrategy(v as any)} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="martingale" id="rec-martingale" />
                            <Label htmlFor="rec-martingale">Martingale</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="martingale-active-switch" className="font-semibold">Ativar Martingale</Label>
                            <InfoTooltip infoText="Se desativado, o bot usará a Stake Inicial em todas as entradas, ignorando perdas anteriores." />
                        </div>
                        <Switch
                            id="martingale-active-switch"
                            checked={isMartingaleActive}
                            onCheckedChange={setIsMartingaleActive}
                        />
                    </div>
                </div>

                <div className={cn("space-y-4 pt-4 border-t", !isMartingaleActive && "opacity-50 pointer-events-none")}>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5"><Label htmlFor="martingaleFactor">Fator Martingale</Label><InfoTooltip infoText="Multiplicador aplicado à stake após uma perda. Ex: 2.2" /></div>
                            <span className="font-bold text-primary">{(parseFloat(martingaleFactor) || 2.2).toFixed(2)}</span>
                        </div>
                        <Slider 
                            id="martingaleFactor" 
                            value={[parseFloat(martingaleFactor) || 2.2]} 
                            onValueChange={(v) => setMartingaleFactor(v[0].toFixed(2))} 
                            min={1.1} 
                            max={3} 
                            step={0.05} 
                            disabled={!isMartingaleActive}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5"><Label htmlFor="maxLevels">Níveis Máximos</Label><InfoTooltip infoText="O número máximo de vezes que a estratégia de recuperação será aplicada." /></div>
                            <span className="font-bold text-primary">{maxLevels}</span>
                        </div>
                        <Slider 
                            id="maxLevels" 
                            value={[maxLevels]} 
                            onValueChange={(v) => setMaxLevels(v[0])} 
                            min={1} 
                            max={10} 
                            step={1} 
                            disabled={!isMartingaleActive}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="takeProfit">Take Profit ($)</Label>
                                <InfoTooltip infoText="Meta de lucro. O bot irá parar quando atingir este valor." />
                            </div>
                            <Input 
                                id="takeProfit" 
                                value={takeProfit} 
                                onChange={handleProfitChange} 
                                placeholder="Ex: 10.00"
                                className="text-base font-bold text-green-600"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="stopLoss">Stop Loss ($)</Label>
                                <InfoTooltip infoText="Limite de perda aceitável. O bot irá parar quando atingir este valor negativo." />
                            </div>
                            <Input 
                                id="stopLoss" 
                                value={stopLoss}
                                onChange={handleStopLossChange}
                                placeholder="Ex: 50.00"
                                className="text-base font-bold text-red-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="maxTrades">Máximo de Entradas</Label>
                            <InfoTooltip infoText="O número máximo de operações que o bot fará. Defina 0 para sem limite." />
                        </div>
                        <Input 
                            id="maxTrades" 
                            type="number"
                            value={maxTrades} 
                            onChange={handleMaxTradesChange} 
                            placeholder="0 (sem limite)"
                            min="0"
                            className="text-base"
                        />
                    </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-1.5">
                        <Label>Modo de Martingale</Label>
                        <InfoTooltip infoText="Define se o Martingale deve ser aplicado imediatamente após a perda." />
                    </div>
                    <RadioGroup value={martingaleMode} onValueChange={(v) => setMartingaleMode(v as 'IMMEDIATE')} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="IMMEDIATE" id="mg-immediate" />
                            <Label htmlFor="mg-immediate">Imediato</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="soros-active-switch" className="font-semibold">Gerenciamento Soros</Label>
                            <InfoTooltip infoText="Ativa o gerenciamento Soros, reinvestindo uma porcentagem do lucro em sequências de vitórias." />
                        </div>
                        <Switch
                            id="soros-active-switch"
                            checked={isSorosActive}
                            onCheckedChange={setIsSorosActive}
                        />
                    </div>
                    {isSorosActive && (
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="soros-levels">Níveis Soros</Label>
                                    <span className="font-bold text-primary">{sorosLevels}</span>
                                </div>
                                <Slider 
                                    id="soros-levels" 
                                    value={[sorosLevels]} 
                                    onValueChange={(v) => setSorosLevels(v[0])} 
                                    min={1} 
                                    max={5} 
                                    step={1} 
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="soros-profit-percentage">Reinvestir Lucro (%)</Label>
                                    <span className="font-bold text-primary">{sorosProfitPercentage}%</span>
                                </div>
                                <Slider 
                                    id="soros-profit-percentage" 
                                    value={[sorosProfitPercentage]} 
                                    onValueChange={(v) => setSorosProfitPercentage(v[0])} 
                                    min={10} 
                                    max={100} 
                                    step={5} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};