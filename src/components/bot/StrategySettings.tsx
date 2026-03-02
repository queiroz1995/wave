"use client";

import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Activity } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ColorPatternConfig } from './ColorPatternConfig';
import { OverUnderPatternConfig } from './OverUnderPatternConfig';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { StrategyAICard } from './StrategyAICard';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "I.A Wave", 
        style: "Conservador", 
        icon: "wave" as const, 
        color: "blue",
        description: "Especialista em seguir tendências e padrões de xadrez.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "probabilistic", 
        name: "I.A Cycle", 
        style: "Moderado", 
        icon: "cycle" as const, 
        color: "purple",
        description: "Analisa ciclos estatísticos e fluxo de mercado dominante.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "neuralRico", 
        name: "I.A Rico", 
        style: "Estratégico", 
        icon: "rico" as const, 
        color: "cyan",
        description: "Algoritmo híbrido focado em saturação neural e reversão.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "smartAI", 
        name: "I.A Titan", 
        style: "Agressivo", 
        icon: "titan" as const, 
        color: "orange",
        description: "IA de alto processamento que cataloga padrões lucrativos.",
        compatibleModes: ['evenOdd', 'overUnder'] 
    },
    { 
        id: "doubleOneTrigger", 
        name: "I.A Trigger", 
        style: "Precisão", 
        icon: "trigger" as const, 
        color: "red",
        description: "Gatilho de precisão baseado em sequências de dígitos específicos.",
        compatibleModes: ['evenOdd', 'overUnder'] 
    },
    { 
        id: "colorPattern", 
        name: "I.A Chroma", 
        style: "Analítico", 
        icon: "chroma" as const, 
        color: "green",
        description: "Análise visual de cores e sequências personalizadas.",
        compatibleModes: ['evenOdd', 'overUnder'] 
    },
];

export const StrategySettings = () => {
    const {
        minWinRate, setMinWinRate, marketStabilityThreshold, setMarketStabilityThreshold,
        activeStrategy, setActiveStrategy,
        digitTradeMode,
        catalogerPatternLength, setCatalogerPatternLength,
        catalogerMinWinRate, setCatalogerMinWinRate,
        isDoubleOneTriggerActive, setIsDoubleOneTriggerActive,
        doubleOneTriggerCount, setDoubleOneTriggerCount,
        doubleOneTriggerTargetDigits, setDoubleOneTriggerTargetDigits,
        isStreakFilterActive, setIsStreakFilterActive,
        maxStreakAllowed, setMaxStreakAllowed,
        neuralRicoWindow, setNeuralRicoWindow,
        neuralRicoThreshold, setNeuralRicoThreshold,
        probWindow, setProbWindow,
        reverseOnLoss, setReverseOnLoss,
    } = useBotContext();

    useEffect(() => {
        const strategy = strategies.find(s => s.id === activeStrategy);
        const isCurrentStrategyIncompatible = !strategy?.compatibleModes.includes(digitTradeMode);
        
        if (isCurrentStrategyIncompatible) {
            const compatible = strategies.filter(s => s.compatibleModes.includes(digitTradeMode));
            if (compatible.length > 0) {
                setActiveStrategy(compatible[0].id as any);
                toast.info(`Estratégia alterada para '${compatible[0].name}', compatível com ${digitTradeMode === 'evenOdd' ? 'Par/Ímpar' : 'Acima/Abaixo'}.`);
            }
        }
    }, [digitTradeMode, activeStrategy, setActiveStrategy]);

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
                    <BrainCircuit className="h-6 w-6" /> Selecionar Especialista (I.A)
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-8">
                {/* Filtro de Estabilidade moved here for better context */}
                <div className="p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold uppercase tracking-tight">Filtro Ant-ZigueZague</Label>
                                <p className="text-[10px] text-muted-foreground">Evita mercados instáveis.</p>
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

                {/* Grid de IAs */}
                <div className="grid grid-cols-2 gap-3">
                    {strategies.map((ia) => (
                        <StrategyAICard 
                            key={ia.id}
                            id={ia.id}
                            name={ia.name}
                            style={ia.style}
                            icon={ia.icon}
                            color={ia.color}
                            description={ia.description}
                            isActive={activeStrategy === ia.id}
                            onClick={() => {
                                if (ia.compatibleModes.includes(digitTradeMode)) {
                                    setActiveStrategy(ia.id as any);
                                } else {
                                    toast.error(`A ${ia.name} não é compatível com o modo ${digitTradeMode === 'evenOdd' ? 'Par/Ímpar' : 'Acima/Abaixo'}.`);
                                }
                            }}
                        />
                    ))}
                </div>

                {/* Configurações Específicas da IA selecionada */}
                <div className="pt-6 border-t space-y-6">
                    <h3 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Ajustes de Precisão
                    </h3>

                    <Tabs value={activeStrategy} className="w-full">
                        <TabsContent value="trendSurfer" className="mt-0 space-y-4">
                            <p className="text-xs text-muted-foreground bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                                **Lógica Surfer:** Busca sequências de 4 cores iguais para entrar na 5ª. <br/>
                                **Lógica Xadrez:** Identifica alternâncias (E-O-E-O) para continuação.
                            </p>
                        </TabsContent>

                        <TabsContent value="probabilistic" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Janela Estatística</Label>
                                <ToggleGroup type="single" value={String(probWindow)} onValueChange={(v) => v && setProbWindow(Number(v))} className="justify-between gap-2">
                                    <ToggleGroupItem value="36" className="flex-1 border-2">36</ToggleGroupItem>
                                    <ToggleGroupItem value="69" className="flex-1 border-2">69</ToggleGroupItem>
                                    <ToggleGroupItem value="96" className="flex-1 border-2">96</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                                <Label className="font-bold text-xs uppercase">Entrada Reversa no Loss</Label>
                                <Switch checked={reverseOnLoss} onCheckedChange={setReverseOnLoss} />
                            </div>
                        </TabsContent>

                        <TabsContent value="neuralRico" className="mt-0 space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs"><Label>Janela de Observação</Label><span className="font-black text-primary">{neuralRicoWindow}</span></div>
                                <Slider value={[neuralRicoWindow]} onValueChange={(val) => setNeuralRicoWindow(val[0])} min={5} max={30} step={1} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs"><Label>Gatilho de Saturação</Label><span className="font-black text-primary">{neuralRicoThreshold}%</span></div>
                                <Slider value={[neuralRicoThreshold]} onValueChange={(val) => setNeuralRicoThreshold(val[0])} min={60} max={90} step={1} />
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="smartAI" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs"><Label>Tamanho do Padrão</Label><span className="font-black text-primary">{catalogerPatternLength}</span></div>
                                    <Slider value={[catalogerPatternLength]} onValueChange={(val) => setCatalogerPatternLength(val[0])} min={2} max={8} step={1}/>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs"><Label>Assertividade Mínima</Label><span className="font-black text-primary">{catalogerMinWinRate}%</span></div>
                                    <Slider value={[catalogerMinWinRate]} onValueChange={(val) => setCatalogerMinWinRate(val[0])} min={50} max={100} step={1}/>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="doubleOneTrigger" className="mt-0 space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Dígitos Alvo</Label>
                                <ToggleGroup type="multiple" value={doubleOneTriggerTargetDigits.map(String)} onValueChange={(values) => setDoubleOneTriggerTargetDigits(values.map(Number))} className="flex flex-wrap gap-2">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                        <ToggleGroupItem key={digit} value={String(digit)} className={cn("w-9 h-9 text-sm font-black rounded-lg border-2", doubleOneTriggerTargetDigits.includes(digit) ? (digit % 2 === 0 ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600') : 'bg-muted')}>{digit}</ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs"><Label>Dígitos Consecutivos</Label><span className="font-black text-primary">{doubleOneTriggerCount}x</span></div>
                                <Slider value={[doubleOneTriggerCount]} onValueChange={(val) => setDoubleOneTriggerCount(val[0])} min={1} max={5} step={1}/>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                                <Label className="font-bold text-xs uppercase">Ativar Estratégia</Label>
                                <Switch checked={isDoubleOneTriggerActive} onCheckedChange={setIsDoubleOneTriggerActive}/>
                            </div>
                        </TabsContent>

                        <TabsContent value="colorPattern" className="mt-0 space-y-6">
                            {digitTradeMode === 'evenOdd' ? <ColorPatternConfig /> : <OverUnderPatternConfig />}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex justify-between items-center text-xs"><Label>Assertividade Mínima</Label><span className="font-black text-primary">{minWinRate}%</span></div>
                                <Slider value={[Number(minWinRate)]} onValueChange={(val) => setMinWinRate(val[0])} min={50} max={100} step={1}/>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="space-y-4 pt-6 border-t">
                        <div className="flex items-center justify-between text-xs">
                            <Label className="uppercase font-bold text-muted-foreground">Filtro de Dominância (%)</Label>
                            <span className="font-black text-primary">{marketStabilityThreshold}%</span>
                        </div>
                        <Slider value={[Number(marketStabilityThreshold)]} onValueChange={(val) => setMarketStabilityThreshold(val[0].toString())} min={0} max={100} step={1}/>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};