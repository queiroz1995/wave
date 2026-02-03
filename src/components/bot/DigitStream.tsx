"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Zap, History } from 'lucide-react';

export const DigitStream = () => {
  const { lastDigits, lastTickEpoch } = useBotContext();
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setProgress(100);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Timer para sincronizar com o tempo do tick (aprox 1s ou 2s dependendo do ativo)
    const step = 2; 
    timerRef.current = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, 20); 

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lastTickEpoch]);

  const streamDigits = lastDigits.slice(0, 20);
  const latestDigit = streamDigits[0];

  const getDigitColor = (digit: number, isGhost = false) => {
    if (digit === 0) return isGhost ? "bg-blue-600/20 text-blue-500 border-blue-500/30" : "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]";
    if (digit % 2 === 0) return isGhost ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/30" : "bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]";
    return isGhost ? "bg-rose-600/20 text-rose-500 border-rose-500/30" : "bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]";
  };

  return (
    <div className="w-full bg-card/40 border-t border-border/50 p-4">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        
        {/* Destaque do Dígito Atual */}
        <div className="flex flex-col items-center justify-center relative min-w-[100px] border-r border-border/50 pr-6">
          <span className="text-[10px] font-black text-muted-foreground uppercase mb-2 flex items-center gap-1 tracking-tighter">
            <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Último Dígito
          </span>
          <div className="relative">
             {/* Barra de Progresso Circular em volta do dígito */}
            <svg className="absolute -inset-2 w-[76px] h-[76px] -rotate-90">
                <circle
                    cx="38"
                    cy="38"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/20"
                />
                <circle
                    cx="38"
                    cy="38"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="213.6"
                    strokeDashoffset={213.6 - (213.6 * progress) / 100}
                    className="text-primary transition-all duration-100 ease-linear"
                />
            </svg>
            <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center text-4xl font-black transition-all duration-200 transform z-10 relative border-2 border-white/10",
                getDigitColor(latestDigit),
                progress > 85 ? "scale-110" : "scale-100"
            )}>
                {latestDigit !== undefined ? latestDigit : '-'}
            </div>
          </div>
        </div>

        {/* Snake de Dígitos (Histórico Horizontal) */}
        <div className="flex-1 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 tracking-tighter">
                <History className="h-3 w-3" /> Sequência Recente
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">Antigos &rarr;</span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {streamDigits.slice(1).map((digit, index) => (
                <div 
                  key={`${lastTickEpoch}-${index}`}
                  className={cn(
                    "h-10 w-10 min-w-[40px] rounded-lg flex items-center justify-center text-lg font-bold border transition-all animate-in slide-in-from-right-4 duration-300",
                    getDigitColor(digit, true)
                  )}
                >
                  {digit}
                </div>
            ))}
            {streamDigits.length < 2 && (
                <div className="h-10 flex items-center text-muted-foreground/40 text-xs italic">Aguardando dados...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};