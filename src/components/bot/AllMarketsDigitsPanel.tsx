import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBotContext } from '@/context/BotContext';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

const MARKETS = [
    {
        "value": "1HZ10V",
        "label": "Vol 10 (1s)"
    },
    {
        "value": "1HZ25V",
        "label": "Vol 25 (1s)"
    },
    {
        "value": "1HZ50V",
        "label": "Vol 50 (1s)"
    },
    {
        "value": "1HZ75V",
        "label": "Vol 75 (1s)"
    },
    {
        "value": "1HZ100V",
        "label": "Vol 100 (1s)"
    },
    {
        "value": "R_10",
        "label": "Vol 10"
    },
    {
        "value": "R_25",
        "label": "Vol 25"
    },
    {
        "value": "R_50",
        "label": "Vol 50"
    },
    {
        "value": "R_75",
        "label": "Vol 75"
    },
    {
        "value": "R_100",
        "label": "Vol 100"
    }
];

export const AllMarketsDigitsPanel = () => {
    const { multiMarketDigits, digitTradeMode, digitPrediction, overUnderDirection } = useBotContext();
    React.useEffect(() => {
        console.log("MultiMarketDigits updated:", Object.keys(multiMarketDigits || {}).length);
    }, [multiMarketDigits]);

    const getDigitColor = (digit: number) => {
        if (digitTradeMode === 'evenOdd') {
            return digit % 2 === 0 ? "text-blue-400" : "text-rose-400";
        }
        if (digitTradeMode === 'overUnder' && digitPrediction !== undefined) {
            if (overUnderDirection === 'OVER') {
                return digit > digitPrediction ? "text-emerald-400" : "text-rose-400";
            } else {
                return digit < digitPrediction ? "text-emerald-400" : "text-rose-400";
            }
        }
        return "text-slate-300";
    };

    return (
        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md flex flex-col mt-4">
            <CardHeader className="py-2 px-3 border-b border-white/5 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-200">
                    <Activity className="h-3 w-3 text-cyan-400" />
                    Radar de Dígitos (Todos os Mercados)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow min-h-[300px]">
                <ScrollArea className="h-full max-h-[300px]">
                    <div className="flex flex-col">
                        {MARKETS.map((market, index) => {
                            const digits = multiMarketDigits?.[market.value] || [];
                            return (
                                <div key={market.value} className={cn(
                                    "flex flex-col gap-1 p-2 border-b border-white/5",
                                    index % 2 === 0 ? "bg-slate-800/20" : "bg-transparent"
                                )}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{market.label}</span>
                                        <Badge variant="outline" className="text-[8px] bg-slate-900 border-white/10 px-1 py-0 h-4">
                                            {digits.length > 0 ? `Tick: ${digits[0]}` : 'Aguardando...'}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-0.5 overflow-hidden">
                                        {digits.slice(0, 30).map((digit: number, i: number) => (
                                            <div 
                                                key={i} 
                                                className={cn(
                                                    "w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-[2px] text-[10px] sm:text-xs font-black shrink-0 bg-slate-950/50 border border-white/5",
                                                    i === 0 ? "border-cyan-500/50 shadow-[0_0_5px_rgba(34,211,238,0.2)]" : "",
                                                    getDigitColor(digit)
                                                )}
                                            >
                                                {digit}
                                            </div>
                                        ))}
                                        {digits.length === 0 && (
                                            <div className="text-[10px] text-slate-500 italic py-1">Sem dados. Verifique a conexão.</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
