"use client";

import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, Target, Hash, Activity, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export const NeuralAnalytics = () => {
    const { lastDigits, priceHistory, isBotRunning, digitPrediction } = useBotContext();

    const analysis = useMemo(() => {
        if (lastDigits.length < 20 || priceHistory.length < 10) return null;

        // 1. RISE/FALL Logic
        const shortTrend = priceHistory[0] - priceHistory[4];
        const momentum = priceHistory[0] - priceHistory[9];
        const rfProb = 50 + (shortTrend > 0 ? 5 : -5) + (momentum > 0 ? 10 : -10);
        const rfResult = rfProb > 50 ? 'SUBIR' : 'DESCER';

        // 2. HIGH/LOW Logic
        const avg = priceHistory.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const hlProb = priceHistory[0] > avg ? 62 : 58;
        const hlResult = priceHistory[0] > avg ? 'ACIMA' : 'ABAIXO';

        // 3. ODD/EVEN Logic
        const evens = lastDigits.slice(0, 20).filter(d => d % 2 === 0).length;
        const evenProb = (evens / 20) * 100;
        const oeResult = evenProb > 50 ? 'PAR' : 'ÍMPAR';
        const oeProbFinal = evenProb > 50 ? evenProb : 100 - evenProb;

        // 4. OVER/UNDER Logic
        const unders = lastDigits.slice(0, 20).filter(d => d < digitPrediction).length;
        const underProb = (unders / 20) * 100;
        const ouResult = underProb > 50 ? 'UNDER' : 'OVER';
        const ouProbFinal = underProb > 50 ? underProb : 100 - underProb;

        // 5. MATCHES/DIFFERS Logic
        const targetCount = lastDigits.slice(0, 30).filter(d => d === digitPrediction).length;
        const differsProb = 100 - ((targetCount / 30) * 100);
        const mdResult = 'DIFERENTE';

        // 6. TOUCH/NO TOUCH Logic
        const volatility = Math.abs(priceHistory[0] - priceHistory[9]);
        const tntProb = volatility > 0.5 ? 65 : 75;
        const tntResult = volatility > 0.5 ? 'TOCAR' : 'NÃO TOCAR';

        // 7. IN/OUT Logic
        const range = Math.max(...priceHistory.slice(0, 10)) - Math.min(...priceHistory.slice(0, 10));
        const ioProb = range < 0.3 ? 68 : 55;
        const ioResult = range < 0.3 ? 'DENTRO' : 'FORA';

        return [
            { id: 'RF', label: 'RISE/FALL', prob: Math.min(95, Math.max(5, rfProb > 50 ? rfProb : 100 - rfProb)), res: rfResult, icon: TrendingUp, color: 'text-cyan-500', motive: 'Inércia de preço e fluxo de momentum detectados.' },
            { id: 'HL', label: 'HIGH/LOW', prob: hlProb, res: hlResult, icon: Target, color: 'text-orange-500', motive: 'Posicionamento em relação à média móvel neural.' },
            { id: 'OE', label: 'ODD/EVEN', prob: oeProbFinal, res: oeResult, icon: Hash, color: 'text-green-500', motive: 'Saturação estatística de paridade observada.' },
            { id: 'OU', label: 'OVER/UNDER', prob: ouProbFinal, res: ouResult, icon: Activity, color: 'text-purple-500', motive: 'Desvio de frequência na barreira alvo.' },
            { id: 'MD', label: 'MATCHES/DIFFERS', prob: differsProb, res: mdResult, icon: ShieldCheck, color: 'text-blue-500', motive: 'Baixa recorrência do dígito predito.' },
            { id: 'TNT', label: 'TOUCH/NO TOUCH', prob: tntProb, res: tntResult, icon: Zap, color: 'text-yellow-500', motive: 'Volatilidade atual indica estabilidade de zona.' },
            { id: 'IO', label: 'IN/OUT', prob: ioProb, res: ioResult, icon: Brain, color: 'text-pink-500', motive: 'Amplitude de canal sugere permanência em zona.' },
        ];
    }, [lastDigits, priceHistory, digitPrediction]);

    if (!analysis) return null;

    return (
        <Card className="glass-panel border-none rounded-[2.5rem] overflow-hidden mt-6">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <Brain className="h-4 w-4" /> Neural Insights v2.1
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                {analysis.map((item) => (
                    <div key={item.id} className="group p-3 rounded-2xl hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <item.icon className={cn("h-4 w-4", item.color)} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-[9px] font-black uppercase tracking-tighter", item.prob > 70 ? "text-green-500" : "text-gray-400")}>
                                    {item.prob.toFixed(0)}% PROB
                                </span>
                                <Badge variant="outline" className={cn("text-[8px] font-bold border-none bg-gray-100 uppercase", item.res === 'SUBIR' || item.res === 'ACIMA' || item.res === 'PAR' || item.res === 'OVER' || item.res === 'DIFERENTE' || item.res === 'NÃO TOCAR' || item.res === 'DENTRO' ? 'text-green-600' : 'text-red-600')}>
                                    {item.res}
                                </Badge>
                            </div>
                        </div>
                        <Progress value={item.prob} className="h-1 bg-gray-100" />
                        <p className="text-[8px] text-gray-400 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.motive}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};