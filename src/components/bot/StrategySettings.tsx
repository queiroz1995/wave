"use client";

import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Bot, Hash, Activity } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ColorPatternConfig } from './ColorPatternConfig';
import { OverUnderPatternConfig } from './OverUnderPatternConfig';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const strategyTabs = [
    { value: "smartAI", label: "IA Super Poderosa", compatibleModes: ['evenOdd', 'overUnder'] },
    { value: "doubleOneTrigger", label: "Gatilho de Dígitos Consecutivos", compatibleModes: ['evenOdd', 'overUnder'] },
    { value: "colorPattern", label: "Padrão de Cores", compatibleModes: ['evenOdd', 'overUnder'] },
];

export const StrategySettings = () => {
    const {
        minWinRate, setMinWinRate, marketStabilityThreshold, setMarketStabilityThreshold,
        activeStrategy, setActiveStrategy,
        imbalanceAnalysisWindow, setImbalanceAnalysisWindow,
        imbalanceTriggerPercentage, setImbalanceTriggerPercentage,
        imbalanceTradeMode, setImbalanceTradeMode,
        analyzerMinWinRate, setAnalyzerMinWinRate,
        analyzerAutoTrade, setAnalyzerAutoTrade,
        digitTradeMode,
        dynamicAnalysisWindow, setDynamicAnalysisWindow,
        catalogerPatternLength, setCatalogerPatternLength,
        catalogerMinWinRate, setCatalogerMinWinRate,
        catalogerMartingaleLevels, setCatalogerMartingaleLevels,
        catalogerMinOccurrences, setCatalogerMinOccurrences,
        surferAnalysisWindow, setSurferAnalysisWindow,
        surferTriggerPercentage, setSurferTriggerPercentage,
        isDoubleOneTriggerActive, setIsDoubleOneTriggerActive,
        doubleOneTriggerCount, setDoubleOneTriggerCount,
        doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits,
        // NOVO
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
    } = useBotContext();

    const allStrategyTabs = strategyTabs;

    useEffect(() => {
        const isCurrentStrategyIncompatible = !strategyTabs.find(tab => tab.value === activeStrategy)?.compatibleModes.includes(digitTradeMode);
        if (isCurrentStrategyIncompatible) {
            const compatibleTabs = strategyTabs.filter(tab => tab.compatibleModes.includes(digitTradeMode));
            if (compatibleTabs.length > 0) {
                const newActiveStrategy = compatibleTabs[0].value;
                setActiveStrategy(newActiveStrategy as any);
                toast.info(`Estratégia alterada para '${compatibleTabs[0].label}', compatível com o modo ${digitTradeMode === 'evenOdd' ? 'Par/Ímpar' : 'Acima/Abaixo'}.`);
            }
        }
    }, [digitTradeMode, activeStrategy, setActiveStrategy]);

    const handleTargetDigitToggle = (digit: number) => {
        setDoubleOneTriggerTargetDigits(prev => {
            if (prev.includes(digit)) {
                return prev.filter(d => d !== digit).sort((a, b) => a - b);
            } else {
                return [...prev, digit].sort((a, b) => a - b);
            }
        });
    };

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
                {/* NOVO: FILTRO DE ESTABILIDADE (ZIGUE-ZAGUE) */}
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
                            <p className="text-[10px] text-center text-muted-foreground italic">
                                Recomendado: 2 para mercados bem alternados.
                            </p>
                        </div>
                    )}
                </div>

                <Tabs value={activeStrategy} onValueChange={(value) => setActiveStrategy(value as any)} className="w-full">
                    <TabsList className="flex w-full gap-1 p-0 bg-transparent overflow-x-auto custom-scrollbar">
                        {allStrategyTabs.map(tab => renderTabTrigger(
                            tab.value, 
                            tab.label, 
                            !tab.compatibleModes.includes(digitTradeMode)
                        ))}
                    </TabsList>
                    
                    <TabsContent value="smartAI" className="mt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-primary/10 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Bot className="h-5 w-5" />
                                <span>Análise Inteligente Autônoma (Baseada no Catalogador)</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Esta IA analisa o histórico de 500 dígitos para encontrar o padrão mais lucrativo, usando as configurações de filtro abaixo.
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Tamanho do Padrão (Catalogador)</Label>
                                <span className="font-bold text-primary">{catalogerPatternLength}</span>
                            </div>
                            <Slider 
                                value={[catalogerPatternLength]} 
                                onValueChange={(val) => setCatalogerPatternLength(val[0])} 
                                min={2} 
                                max={8} 
                                step={1}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Assertividade Mínima (%)</Label>
                                <span className="font-bold text-primary">{catalogerMinWinRate}%</span>
                            </div>
                            <Slider 
                                value={[catalogerMinWinRate]} 
                                onValueChange={(val) => setCatalogerMinWinRate(val[0])} 
                                min={50} 
                                max={100} 
                                step={1}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Ocorrências Mínimas</Label>
                                <span className="font-bold text-primary">{catalogerMinOccurrences}</span>
                            </div>
                            <Slider 
                                value={[catalogerMinOccurrences]} 
                                onValueChange={(val) => setCatalogerMinOccurrences(val[0])} 
                                min={1} 
                                max={50} 
                                step={1}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Níveis de Martingale (Gale)</Label>
                                <span className="font-bold text-primary">{catalogerMartingaleLevels}</span>
                            </div>
                            <Slider 
                                value={[catalogerMartingaleLevels]} 
                                onValueChange={(val) => setCatalogerMartingaleLevels(val[0])} 
                                min={0} 
                                max={5} 
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">O Catalogador incluirá até {catalogerMartingaleLevels} níveis de Martingale no cálculo da assertividade.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="doubleOneTrigger" className="mt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-primary/10 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Hash className="h-5 w-5" />
                                <span>Estratégia: Gatilho de Dígitos Consecutivos</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Esta estratégia entra automaticamente quando uma sequência de dígitos alvo for identificada.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="double-one-trigger-target-digits">Dígitos Alvo da Sequência</Label>
                                <InfoTooltip 
                                    infoText={
                                        digitTradeMode === 'evenOdd'
                                            ? "Selecione os dígitos que, quando aparecerem consecutivamente, ativarão a estratégia. Para o modo Par/Ímpar, todos os dígitos selecionados devem ter a mesma paridade."
                                            : "Selecione os dígitos que, quando aparecerem consecutivamente, ativarão a estratégia. Para o modo Acima, a barreira será o menor dígito selecionado. Para o modo Abaixo, a barreira será o maior dígito selecionado."
                                    } 
                                />
                            </div>
                            <ToggleGroup 
                                type="multiple" 
                                value={doubleOneTriggerTargetDigits.map(String)} 
                                onValueChange={(values) => setDoubleOneTriggerTargetDigits(values.map(Number))}
                                className="flex flex-wrap gap-2 justify-start"
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                    <ToggleGroupItem
                                        key={digit}
                                        value={String(digit)}
                                        aria-label={`Toggle digit ${digit}`}
                                        className={cn(
                                            "w-10 h-10 text-lg font-bold rounded-md",
                                            doubleOneTriggerTargetDigits.includes(digit)
                                                ? (digit % 2 === 0 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600')
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        )}
                                    >
                                        {digit}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <p className="text-xs text-muted-foreground">
                                Dígitos selecionados: {doubleOneTriggerTargetDigits.length > 0 ? doubleOneTriggerTargetDigits.join(', ') : 'Nenhum'}
                            </p>
                            {digitTradeMode === 'evenOdd' && doubleOneTriggerTargetDigits.length > 0 && (
                                (() => {
                                    const firstParity = doubleOneTriggerTargetDigits[0] % 2;
                                    const allSameParity = doubleOneTriggerTargetDigits.every(d => d % 2 === firstParity);
                                    if (!allSameParity) {
                                        return (
                                            <p className="text-sm text-destructive font-semibold mt-2">
                                                ⚠️ Para o modo Par/Ímpar, todos os dígitos alvo devem ter a mesma paridade.
                                            </p>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="double-one-trigger-count">Número de Dígitos Consecutivos</Label>
                                <span className="font-bold text-primary">{doubleOneTriggerCount}</span>
                            </div>
                            <Slider
                                id="double-one-trigger-count"
                                value={[doubleOneTriggerCount]}
                                onValueChange={(val) => setDoubleOneTriggerCount(val[0])}
                                min={1}
                                max={5}
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                O bot aguardará esta quantidade de dígitos alvo seguidos para ativar a entrada.
                            </p>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="double-one-trigger-switch" className="font-semibold">Ativar Estratégia</Label>
                                <Switch
                                    id="double-one-trigger-switch"
                                    checked={isDoubleOneTriggerActive}
                                    onCheckedChange={setIsDoubleOneTriggerActive}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Quando ativada, o bot fará entradas automáticas ao detectar a sequência dos dígitos alvo.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="colorPattern" className="mt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-primary/10 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-primary">
                                <Hash className="h-5 w-5" />
                                <span>Estratégia: Padrão de Cores</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Crie e gerencie seus próprios padrões de dígitos (Par/Ímpar ou Acima/Abaixo) para o bot seguir.
                            </p>
                        </div>
                        {digitTradeMode === 'evenOdd' ? (
                            <ColorPatternConfig />
                        ) : (
                            <OverUnderPatternConfig />
                        )}
                        <div className="space-y-2 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label>Assertividade Mínima (%)</Label>
                                <span className="font-bold text-primary">{minWinRate}%</span>
                            </div>
                            <Slider 
                                value={[Number(minWinRate)]} 
                                onValueChange={(val) => setMinWinRate(val[0])} 
                                min={50} 
                                max={100} 
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">O bot só usará padrões com esta assertividade ou superior.</p>
                        </div>
                    </TabsContent>

                    <div className="space-y-4 pt-6 mt-6 border-t">
                        <h3 className="font-semibold text-sm text-primary">Filtros Gerais de Entrada</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Label>Dominância Mínima de Mercado (%)</Label>
                                    <InfoTooltip infoText="O bot só opera se a diferença percentual entre Par e Ímpar for maior ou igual a este valor." />
                                </div>
                                <span className="font-bold text-primary">{marketStabilityThreshold}%</span>
                            </div>
                            <Slider 
                                value={[Number(marketStabilityThreshold)]} 
                                onValueChange={(val) => setMarketStabilityThreshold(val[0].toString())} 
                                min={0} 
                                max={100} 
                                step={1}
                            />
                        </div>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};