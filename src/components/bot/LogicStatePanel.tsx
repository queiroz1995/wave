"use client";
import React from 'react';
import { Clock, Cpu, Zap } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from '@/components/ui/card';

interface DigitBarProps {
  digit: number;
  timestamp: string;
}

const DigitBar: React.FC<DigitBarProps> = ({ digit, timestamp }) => {
  const isEven = digit % 2 === 0;
  const heightPercentage = (digit / 9) * 70 + 30; 
  
  const colorClass = isEven 
    ? 'bg-green-500/60 hover:bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
    : 'bg-red-500/60 hover:bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            "flex-1 rounded-t-sm flex items-end justify-center text-[10px] font-black transition-all duration-300 hover:scale-110 hover:z-20 cursor-crosshair border-b-2 pb-1 border-white/10",
            colorClass
          )}
          style={{ height: `${heightPercentage}%` }}
        >
          <span className="opacity-0 hover:opacity-100 transition-opacity">{digit}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-black/90 border-white/20 text-white font-mono text-[10px]">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between gap-4"><span>DATA_POINT:</span> <span className="text-primary">{digit}</span></div>
          <div className="flex justify-between gap-4"><span>PARITY:</span> <span className={isEven ? "text-green-400" : "text-red-400"}>{isEven ? 'EVEN' : 'ODD'}</span></div>
          <div className="flex justify-between gap-4"><span>TS:</span> <span>{timestamp}</span></div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export const LogicStatePanel: React.FC = () => {
  const { lastDigits, isBotRunning } = useBotContext();
  
  const digitsWithMockTimestamps = lastDigits.slice(0, 60).map((digit, index) => ({
    digit,
    timestamp: new Date(Date.now() - index * 1000).toLocaleTimeString('pt-BR', { hour12: false }),
  })).reverse();

  return (
    <Card className="w-full p-4 relative overflow-hidden glass-panel border-white/10 group">
      <div className="absolute inset-0 ai-scanline opacity-10" />
      
      <div className="flex items-center justify-between mb-4 relative z-10 px-1">
        <div className="flex items-center gap-2">
            <Cpu className={cn("h-4 w-4", isBotRunning ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Neural_Data_Stream</h4>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Even</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Odd</span>
            </div>
        </div>
      </div>

      <div className="h-40 flex items-end gap-0.5 border-b border-white/5 pt-2 relative z-10 bg-black/40 rounded-t-lg p-2 group-hover:bg-black/20 transition-colors duration-500">
        {/* Grid lines background */}
        <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white/20" />)}
        </div>

        {digitsWithMockTimestamps.length > 0 ? (
          digitsWithMockTimestamps.map((item, index) => (
            <DigitBar 
              key={index} 
              digit={item.digit} 
              timestamp={item.timestamp} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground/40 gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Zap className="h-6 w-6 animate-pulse" />
            Initializing Neural Link...
          </div>
        )}
      </div>
      
      <div className="mt-3 flex justify-between text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] relative z-10 px-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Historical_Buffer</span>
        <span className="flex items-center gap-1">Live_Feed <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" /></span>
      </div>
    </Card>
  );
};