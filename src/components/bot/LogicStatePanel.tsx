"use client";
import React from 'react';
import { Clock } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from '@/components/ui/card';

// Componente para uma única barra vertical de dígito
interface DigitBarProps {
  digit: number;
  timestamp: string;
}

const DigitBar: React.FC<DigitBarProps> = ({ digit, timestamp }) => {
  const isEven = digit % 2 === 0;
  // O dígito 0 é par, então ele usará a cor verde (EVEN)
  const heightPercentage = (digit / 9) * 80 + 20; 
  
  // Define a cor com base se é par ou ímpar
  const colorClass = isEven 
    ? 'bg-green-500/80 text-white border-green-600' 
    : 'bg-red-500/80 text-white border-red-600';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "flex-1 rounded-t-sm flex items-end justify-center text-xs font-bold transition-all duration-150 hover:scale-105 hover:z-20 cursor-default border-b-2 pb-1",
            colorClass
          )}
          style={{ height: `${heightPercentage}%` }}
        >
          {digit}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <p>Dígito: {digit}</p>
        <p>Hora: {timestamp}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const LogicStatePanel: React.FC = () => {
  const { lastDigits } = useBotContext();
  
  const digitsWithMockTimestamps = lastDigits.slice(0, 50).map((digit, index) => ({
    digit,
    timestamp: new Date(Date.now() - index * 1000).toLocaleTimeString('pt-BR', { hour12: false }),
  })).reverse();

  return (
    <Card className="w-full p-4 relative overflow-hidden">
      <div className="h-32 flex items-end gap-0.5 border-b border-border/50 pt-2 relative z-10 bg-muted/30 rounded-t-md p-1">
        {digitsWithMockTimestamps.length > 0 ? (
          digitsWithMockTimestamps.map((item, index) => (
            <DigitBar 
              key={index} 
              digit={item.digit} 
              timestamp={item.timestamp} 
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full w-full text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Aguardando dados de ticks...
          </div>
        )}
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-muted-foreground relative z-10">
        <span>Mais Antigo</span>
        <span>Mais Recente</span>
      </div>
    </Card>
  );
};