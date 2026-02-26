"use client";

import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Bot, Hash, Activity, Zap } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ColorPatternConfig } from './ColorPatternConfig';
import { OverUnderPatternConfig } from './OverUnderPatternConfig';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const strategyTabs = [
    { value: "neuralRico", label: "Algoritmo Neural Rico", compatibleModes: ['evenOdd'] },
    { value: "smartAI", label: "IA Super Poderosa", compatibleModes: ['evenOdd', 'overUnder'] },
    { value: "doubleOneTrigger", label: "Gatilho Consecutivo", compatibleModes: ['evenOdd', 'overUnder'] },
    { value: "colorPattern", label: "Padrão de Cores", compatibleModes: ['evenOdd', 'overUnder'] },
];

export const StrategySettings = () => {
    const {
        minWinRate, setMinWinRate, marketStabilityThreshold, setMarketStabilityThreshold,
        activeStrategy, setActiveStrategy,
        digitTradeMode,
        catalogerPatternLength, setCatalogerPatternLength,
        catalogerMinWinRate, setCatalogerMinWinRate,
        catalogerMartingaleLevels, setCatalogerMartingaleLevels,
        catalogerMinOccurrences, setCatalogerMinOccurrences,
        isDoubleOneTriggerActive, setIsDoubleOneTriggerActive,
        doubleOneTriggerCount, setDoubleOneTriggerCount,
        doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits,
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
        // NEURAL RICO
        neuralRicoWindow, setNeuralRicoWindow,
        neuralRicoThreshold, setNeuralRicoThreshold,
    } = useBotContext();

    useEffect(() => {
        const strategy = strategyTabs.find(tab => tab.value === activeStrategy);
        const isCurrentStrategyIncompatible = !strategy?.compatibleModes.includes(digitTradeMode);
        
        if (isCurrentStrategyIncompatible) {
            const compatibleTabs = strategyTabs.filter(tab => tab.compatibleModes.includes(digitTradeMode));
            if (compatibleTabs.length > 0) {
                const newActiveStrategy = compatibleTabs[0].value;
                setActiveStrategy(newActiveStrategy as any);
                toast.info(`Estratégia alterada para '${compatibleTabs[0].label}', compatível com o modo ${digitTradeMode === 'evenOdd' ? 'Par/Ímpar' : 'Acima/Abaixo'}.`);
            }
        }
    }, [digitTradeMode, activeStrategy, setActiveStrategy]);

    const renderTabTrigger = (value: string, label: string, isDisabled: boolean) => (
        <TabsTrigger 
            value={value} 
            className={cn(
                "flex-1 h-auto py-2 px-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=inactive]:bg-muted data-[data-[state=inactive]:text-muted-foreground hover:bg-muted/80",
                isDisabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={isDisabled}
        >
            {label}
        </TabsTrigger>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><BrainCircuit className="h-5 w-5" />Configurações de Estratégia</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Filtro de Estabilidade (Zigue-Zague)</Label>
                                <p className="text-[10px] text-muted-foreground">Evita entrar em mercados com muitas sequências seguidas.</p>
                            </div>
                        </div>
                        <Switch 
                            checked={isStreakFilterActive} 
                            onCheckedChange={setIsStreakFilterActive}
                        />
                    </div>
                    {isStreakFilterActive && (
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <Label className="text-xs">Sequência Máxima Permitida</Label>
                                    <InfoTooltip infoText="Se o mercado tiver uma sequência maior que esta (ex: 3 Pars seguidos), o bot não fará entradas até que o mercado volte a alternar." />
                                </div>
                                <span className="font-bold text-primary">{maxStreakAllowed}</span>
                            </div>
                            <Slider 
                                value={[maxStreakAllowed]} 
                                onValueChange={(val) => setMaxStreakAllowed(val[0])} 
                                min={1} 
                                max={5} 
                                step={1}
                            />
                        </div>
                    )}
                </div>

                <Tabs value={activeStrategy} onValueChange={(value) => setActiveStrategy(value as any)} className="w-full">
                    <TabsList className="flex w-full gap-1 p-0 bg-transparent overflow-x-auto custom-scrollbar">
                        {strategyTabs.map(tab => renderTabTrigger(
                            tab.value, 
                            tab.label, 
                            !tab.compatibleModes.includes(digitTradeMode)
                        ))}
                    </TabsList>

                    <TabsContent value="neuralRico" className="mt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-primary/10 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Zap className="h-5 w-5" />
                                <span>Algoritmo Neural Rico (Híbrido)</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Estratégia avançada que alterna entre seguir o fluxo do mercado e apostar na reversão por saturação estatística.
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Janela de Observação</Label>
                                <span className="font-bold text-primary">{neuralRicoWindow} dígitos</span>
                            </div>
                            <Slider 
                                value={[neuralRicoWindow]} 
                                onValueChange={(val) => setNeuralRicoWindow(val[0])} 
                                min={5} 
                                max={30} 
                                step={1}
                            />
                            <p className="text-[10px] text-muted-foreground">Quantos dígitos a IA analisa para detectar o estado do mercado.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Gatilho de Saturação (%)</Label>
                                <span className="font-bold text-primary">{neuralRicoThreshold}%</span>
                            </div>
                            <Slider 
                                value={[neuralRicoThreshold]} 
                                onValueChange={(val) => setNeuralRicoThreshold(val[0])} 
                                min={60} 
                                max={90} 
                                step={1}
                            />
                            <p className="text-[10px] text-muted-foreground">Porcentagem necessária de um lado para a IA forçar a reversão.</p>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="smartAI" className="mt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-primary/10 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Bot className="h-5 w-5" />
                                <span>Análise Inteligente Autônoma</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Esta IA analisa o histórico de 500 dígitos para encontrar o padrão mais lucrativo.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between"><Label>Tamanho do Padrão</Label><span className="font-bold text-primary">{catalogerPatternLength}</span></div>
                            <Slider value={[catalogerPatternLength]} onValueChange={(val) => setCatalogerPatternLength(val[0])} min={2} max={8} step={1}/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between"><Label>Assertividade Mínima (%)</Label><span className="font-bold text-primary">{catalogerMinWinRate}%</span></div>
                            <Slider value={[catalogerMinWinRate]} onValueChange={(val) => setCatalogerMinWinRate(val[0])} min={50} max={100} step={1}/>
                        </div>
                    </TabsContent>

                    <TabsContent value="doubleOneTrigger" className="mt-4 space-y-6">
                        <div className="space-y-3">
                            <Label>Dígitos Alvo da Sequência</Label>
                            <ToggleGroup type="multiple" value={doubleOneTriggerTargetDigits.map(String)} onValueChange={(values) => setDoubleOneTriggerTargetDigits(values.map(Number))} className="flex flex-wrap gap-2 justify-start">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                    <ToggleGroupItem key={digit} value={String(digit)} className={cn("w-10 h-10 text-lg font-bold rounded-md", doubleOneTriggerTargetDigits.includes(digit) ? (digit % 2 === 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-muted')}>{digit}</ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><Label>Número de Dígitos Consecutivos</Label><span className="font-bold text-primary">{doubleOneTriggerCount}</span></div>
                            <Slider value={[doubleOneTriggerCount]} onValueChange={(val) => setDoubleOneTriggerCount(val[0])} min={1} max={5} step={1}/>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                            <Label className="font-semibold">Ativar Estratégia</Label>
                            <Switch checked={isDoubleOneTriggerActive} onCheckedChange={setIsDoubleOneTriggerActive}/>
                        </div>
                    </TabsContent>

                    <TabsContent value="colorPattern" className="mt-4 space-y-6">
                        {digitTradeMode === 'evenOdd' ? <ColorPatternConfig /> : <OverUnderPatternConfig />}
                        <div className="space-y-2 pt-4 border-t">
                            <div className="flex items-center justify-between"><Label>Assertividade Mínima (%)</Label><span className="font-bold text-primary">{minWinRate}%</span></div>
                            <Slider value={[Number(minWinRate)]} onValueChange={(val) => setMinWinRate(val[0])} min={50} max={100} step={1}/>
                        </div>
                    </TabsContent>

                    <div className="space-y-4 pt-6 mt-6 border-t">
                        <h3 className="font-semibold text-sm text-primary">Filtros Gerais de Entrada</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Dominância Mínima de Mercado (%)</Label>
                                <span className="font-bold text-primary">{marketStabilityThreshold}%</span>
                            </div>
                            <Slider value={[Number(marketStabilityThreshold)]} onValueChange={(val) => setMarketStabilityThreshold(val[0].toString())} min={0} max={100} step={1}/>
                        </div>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};