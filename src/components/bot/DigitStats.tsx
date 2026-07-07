"use client";
import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Percent } from 'lucide-react';

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

  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Percent className="h-4 w-4" />
        <h4 className="font-semibold">Estatísticas dos Últimos {analyzerWindowSize} Dígitos</h4>
      </div>
      
      <div className="flex justify-between items-end gap-1 h-24 bg-muted/30 rounded-md p-2">
        {digitStats.map(({ digit, count, percentage }) => {
          const isEven = digit % 2 === 0;
          const isZero = digit === 0;
          
          // Define a cor com base se é par, ímpar ou zero
          const colorClass = isZero 
            ? 'bg-blue-500/80' // Azul para 0
            : isEven 
              ? 'bg-green-500/80' // Verde para Par
              : 'bg-red-500/80'; // Vermelho para Ímpar
          
          return (
            <Tooltip key={digit}>
              <TooltipTrigger asChild>
                <div className="flex-1 flex flex-col items-center justify-end h-full gap-1 cursor-default">
                  <div className="relative w-full h-full flex items-end justify-center">
                    <div 
                      className={cn("w-full rounded-t-sm transition-all duration-75", colorClass)}
                      style={{ height: `${percentage}%` }}
                    />
                    <div
                      className="absolute w-full text-center transition-all duration-75"
                      style={{ bottom: `${percentage}%`, paddingBottom: '2px' }}
                    >
                      <span className="text-foreground text-[11px] font-bold [text-shadow:0_0_4px_hsl(var(--background))]">
                        {percentage > 0 ? `${percentage.toFixed(0)}%` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold">{digit}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dígito: {digit}</p>
                <p>Ocorrências: {count}</p>
                <p>Frequência: {percentage.toFixed(1)}%</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};