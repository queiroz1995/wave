"use client";
import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3 } from 'lucide-react';

export const DigitStats = () => {
  const { lastDigits, analyzerWindowSize } = useBotContext();
  
  const digitStats = useMemo(() => {
    const digitsToAnalyze = lastDigits.slice(0, analyzerWindowSize);
    const total = digitsToAnalyze.length;
    
    if (total === 0) {
      return Array(10).fill(0).map((_, i) => ({
        digit: i,
        count: 0,
        percentage: 0
      }));
    }
    
    const counts = new Array(10).fill(0);
    for (const digit of digitsToAnalyze) {
      counts[digit]++;
    }
    
    return counts.map((count, digit) => ({
      digit,
      count,
      percentage: (count / total) * 100,
    }));
  }, [lastDigits, analyzerWindowSize]);

  const getBarColor = (digit: number) => {
    if (digit === 0) return "from-blue-600 to-blue-400";
    if (digit % 2 === 0) return "from-emerald-600 to-emerald-400";
    return "from-rose-600 to-rose-400";
  };

  return (
    <div className="p-4 border-t border-border/50 bg-card/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Frequência ({analyzerWindowSize} ticks)</span>
        </div>
        <div className="flex gap-3 text-[9px] font-bold">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600" /> Zero</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-600" /> Par</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-600" /> Ímpar</div>
        </div>
      </div>
      
      <div className="flex justify-between items-end gap-1.5 h-32 px-1">
        {digitStats.map(({ digit, count, percentage }) => (
            <Tooltip key={digit}>
              <TooltipTrigger asChild>
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="relative w-full flex-grow flex flex-col justify-end items-center">
                    {/* Texto da porcentagem acima da barra */}
                    <span className="text-[9px] font-black text-foreground mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {percentage.toFixed(0)}%
                    </span>
                    
                    {/* Barra de progresso vertical */}
                    <div className="w-full relative flex flex-col justify-end h-full max-h-[100px]">
                        <div 
                            className={cn(
                                "w-full rounded-t-md transition-all duration-500 bg-gradient-to-t shadow-lg",
                                getBarColor(digit)
                            )}
                            style={{ height: `${Math.max(percentage, 5)}%` }}
                        />
                    </div>
                  </div>
                  
                  {/* Número do dígito no rodapé */}
                  <div className="mt-2 w-full text-center py-1 rounded-md bg-muted/50 border border-border/50">
                    <span className="text-xs font-black">{digit}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover/95 backdrop-blur-sm border-primary/20">
                <div className="text-xs space-y-1">
                    <p className="font-bold border-b pb-1 mb-1">Dígito {digit}</p>
                    <p className="flex justify-between gap-4"><span>Ocorrências:</span> <span className="font-mono">{count}</span></p>
                    <p className="flex justify-between gap-4"><span>Frequência:</span> <span className="font-mono text-primary">{percentage.toFixed(1)}%</span></p>
                </div>
              </TooltipContent>
            </Tooltip>
        ))}
      </div>
    </div>
  );
};