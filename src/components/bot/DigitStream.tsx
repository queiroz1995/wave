"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Zap, Clock } from 'lucide-react';

export const DigitStream = () => {
  const { lastDigits, lastTickEpoch } = useBotContext();
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setProgress(100);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const step = 2; 
    timerRef.current = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, 20); 

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lastTickEpoch]);

  const streamDigits = lastDigits.slice(0, 15);
  const latestDigit = streamDigits[0];

  return (
    <div className="w-full p-4 border-t bg-card/40 overflow-hidden relative">
      <div className="flex items-center gap-6">
        
        <div className="flex flex-col items-center justify-center border-r pr-6 border-border/50">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" /> Atual
          </span>
          <div className={cn(
            "h-16 w-16 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-2xl transition-all duration-300 transform",
            latestDigit % 2 === 0 ? (latestDigit === 0 ? "bg-blue-600 ring-4 ring-blue-500/30" : "bg-green-600 ring-4 ring-green-500/30") : "bg-red-600 ring-4 ring-red-500/30",
            progress > 80 ? "scale-110 shadow-primary/20" : "scale-100"
          )}>
            {latestDigit !== undefined ? latestDigit : '-'}
          </div>
          <div className="w-full h-1 bg-muted mt-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-1">
            <Clock className="h-3 w-3" /> Histórico Recente
          </span>
          <div className="flex items-center justify-start gap-2 h-12 overflow-x-auto custom-scrollbar">
            {streamDigits.slice(1).map((digit, index) => {
              const isEven = digit % 2 === 0;
              const isZero = digit === 0;
              
              const colorClass = isZero 
                ? "bg-blue-600/60" 
                : isEven 
                  ? "bg-green-600/60" 
                  : "bg-red-600/60";
              
              return (
                <div 
                  key={`${lastTickEpoch}-${index}`}
                  className={cn(
                    "h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm border border-white/10 animate-in slide-in-from-left-2 duration-300",
                    colorClass
                  )}
                >
                  {digit}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};