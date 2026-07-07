"use client";
import React, { useRef, useEffect, useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

export const DigitStream = () => {
  const { lastDigits, lastTickEpoch } = useBotContext();
  const streamDigits = lastDigits.slice(0, 30);
  const [flashKey, setFlashKey] = useState(0);
  const prevLenRef = useRef(lastDigits.length);

  useEffect(() => {
    if (lastDigits.length !== prevLenRef.current) {
      prevLenRef.current = lastDigits.length;
      setFlashKey(k => k + 1);
    }
  }, [lastDigits.length]);

  return (
    <div className="w-full p-4 border-t border-white/5 bg-black/20 overflow-hidden relative group">
      <div className="absolute inset-0 ai-scanline opacity-5" />
      
      <div className="flex items-center justify-start flex-row-reverse h-12 gap-2 relative z-10">
        {streamDigits.map((digit, index) => {
          const isEven = digit % 2 === 0;
          const isZero = digit === 0;
          const isMostRecent = index === 0;
          
          const colors: Record<string, string> = {
            even: "bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
            odd: "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
            zero: "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
          };

          const activeColor = isZero ? colors.zero : isEven ? colors.even : colors.odd;
          
          return (
            <div 
              key={`${flashKey}-${index}`}
              className={cn(
                "h-9 w-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black border font-mono",
                activeColor,
                isMostRecent 
                    ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-black z-10 animate-tick-flash" 
                    : "scale-100 opacity-60 hover:opacity-100"
              )}
            >
              {digit}
            </div>
          );
        })}
      </div>
    </div>
  );
};
