"use client";
import React from 'react';
import { Cpu, Activity, Clock } from 'lucide-react';
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
  const heightPercentage = (digit / 9) * 80 + 20; // Aumentado para 20% de altura mínima para melhor visibilidade
  
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
  const { lastDigits, isBotRunning, currentSignal, currentSignalDetails } = useBotContext();
  
  const statusMessage = isBotRunning 
    ? (currentSignal 
      ? `Sinal Ativo: ${currentSignal === 'DIGITEVEN' ? 'PAR' : 'ÍMPAR'}` 
      : 'Aguardando Padrão...')
    : 'Bot Parado';
    
  const statusColor = isBotRunning 
    ? (currentSignal ? 'text-primary' : 'text-yellow-500') 
    : 'text-red-500';

  const digitsWithMockTimestamps = lastDigits.slice(0, 50).map((digit, index) => ({
    digit,
    timestamp: new Date(Date.now() - index * 1000).toLocaleTimeString('pt-BR', { hour12: false }),
  })).reverse();

  return (
    <Card className="w-full p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 text-foreground/50">
        <Cpu className="h-24 w-24" />
      </div>
      
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <div className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            Estado da Lógica
          </div>
          <div className={cn("text-sm font-mono mt-1 truncate max-w-[300px] font-semibold", statusColor)}>
            {statusMessage}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase font-bold text-muted-foreground">Estratégia Ativa</div>
          <div className="text-sm font-semibold text-foreground">
            {currentSignalDetails?.strategyName || 'N/A'}
          </div>
        </div>
      </div>
      
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