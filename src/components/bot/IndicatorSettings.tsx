import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBotContext } from '@/context/BotContext';
import { LineChart, Activity, TrendingUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const IndicatorSettings = () => {
    const { strategyConfig, setStrategyConfig } = useBotContext();

    const handleIndicatorToggle = (indicator: string) => {
        setStrategyConfig((prev: any) => {
            const active = prev.activeIndicators || [];
            if (active.includes(indicator)) {
                return { ...prev, activeIndicators: active.filter((i: string) => i !== indicator) };
            } else {
                return { ...prev, activeIndicators: [...active, indicator] };
            }
        });
    };

    const handleConfigChange = (key: string, value: any) => {
        setStrategyConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const isIndicatorActive = (indicator: string) => {
        return (strategyConfig?.activeIndicators || []).includes(indicator);
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
                    <Activity className="h-6 w-6" /> Indicadores Técnicos
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <Accordion type="multiple" className="w-full space-y-4">
                    {/* RSI */}
                    <AccordionItem value="rsi" className="border-2 border-primary/20 rounded-2xl bg-primary/5 px-4">
                        <div className="flex items-center justify-between py-4">
                            <AccordionTrigger className="hover:no-underline py-0 border-none">
                                <div className="flex items-center gap-2 text-left">
                                    <LineChart className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="text-sm font-bold uppercase tracking-tight">RSI (IFR)</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">Índice de Força Relativa</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <Switch 
                                checked={isIndicatorActive('RSI')} 
                                onCheckedChange={() => handleIndicatorToggle('RSI')} 
                                className="ml-4"
                            />
                        </div>
                        <AccordionContent>
                            <div className="space-y-6 pt-4 pb-2">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <Label>Período (Velas)</Label>
                                        <span className="font-black text-primary">{strategyConfig?.rsiPeriod || 14}</span>
                                    </div>
                                    <Slider 
                                        value={[strategyConfig?.rsiPeriod || 14]} 
                                        onValueChange={(val) => handleConfigChange('rsiPeriod', val[0])} 
                                        min={2} max={50} step={1} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <Label>Sobrecompra</Label>
                                            <span className="font-black text-primary">{strategyConfig?.rsiOverbought || 70}</span>
                                        </div>
                                        <Slider 
                                            value={[strategyConfig?.rsiOverbought || 70]} 
                                            onValueChange={(val) => handleConfigChange('rsiOverbought', val[0])} 
                                            min={50} max={100} step={1} 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <Label>Sobrevenda</Label>
                                            <span className="font-black text-primary">{strategyConfig?.rsiOversold || 30}</span>
                                        </div>
                                        <Slider 
                                            value={[strategyConfig?.rsiOversold || 30]} 
                                            onValueChange={(val) => handleConfigChange('rsiOversold', val[0])} 
                                            min={0} max={50} step={1} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* MACD */}
                    <AccordionItem value="macd" className="border-2 border-primary/20 rounded-2xl bg-primary/5 px-4">
                        <div className="flex items-center justify-between py-4">
                            <AccordionTrigger className="hover:no-underline py-0 border-none">
                                <div className="flex items-center gap-2 text-left">
                                    <Activity className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="text-sm font-bold uppercase tracking-tight">MACD</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">Convergência/Divergência</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <Switch 
                                checked={isIndicatorActive('MACD')} 
                                onCheckedChange={() => handleIndicatorToggle('MACD')} 
                                className="ml-4"
                            />
                        </div>
                        <AccordionContent>
                            <div className="space-y-6 pt-4 pb-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <Label>Rápida (Fast)</Label>
                                            <span className="font-black text-primary">{strategyConfig?.macdFast || 12}</span>
                                        </div>
                                        <Slider 
                                            value={[strategyConfig?.macdFast || 12]} 
                                            onValueChange={(val) => handleConfigChange('macdFast', val[0])} 
                                            min={1} max={50} step={1} 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <Label>Lenta (Slow)</Label>
                                            <span className="font-black text-primary">{strategyConfig?.macdSlow || 26}</span>
                                        </div>
                                        <Slider 
                                            value={[strategyConfig?.macdSlow || 26]} 
                                            onValueChange={(val) => handleConfigChange('macdSlow', val[0])} 
                                            min={2} max={100} step={1} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <Label>Sinal (Signal)</Label>
                                        <span className="font-black text-primary">{strategyConfig?.macdSignal || 9}</span>
                                    </div>
                                    <Slider 
                                        value={[strategyConfig?.macdSignal || 9]} 
                                        onValueChange={(val) => handleConfigChange('macdSignal', val[0])} 
                                        min={1} max={50} step={1} 
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Médias Móveis */}
                    <AccordionItem value="ma" className="border-2 border-primary/20 rounded-2xl bg-primary/5 px-4">
                        <div className="flex items-center justify-between py-4">
                            <AccordionTrigger className="hover:no-underline py-0 border-none">
                                <div className="flex items-center gap-2 text-left">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    <div>
                                        <div className="text-sm font-bold uppercase tracking-tight">Médias Móveis</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">Identificador de Tendência</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <Switch 
                                checked={isIndicatorActive('MA')} 
                                onCheckedChange={() => handleIndicatorToggle('MA')} 
                                className="ml-4"
                            />
                        </div>
                        <AccordionContent>
                            <div className="space-y-6 pt-4 pb-2">
                                <div className="space-y-3">
                                    <Label className="text-xs">Tipo de Média Móvel</Label>
                                    <Select 
                                        value={strategyConfig?.maType || 'SMA'} 
                                        onValueChange={(val) => handleConfigChange('maType', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SMA">Simples (SMA)</SelectItem>
                                            <SelectItem value="EMA">Exponencial (EMA)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <Label>Período</Label>
                                        <span className="font-black text-primary">{strategyConfig?.maPeriod || 50}</span>
                                    </div>
                                    <Slider 
                                        value={[strategyConfig?.maPeriod || 50]} 
                                        onValueChange={(val) => handleConfigChange('maPeriod', val[0])} 
                                        min={2} max={200} step={1} 
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};
