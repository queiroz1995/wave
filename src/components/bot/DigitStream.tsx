"use client";
import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

export const DigitStream = () => {
  const { lastDigits, lastTickEpoch } = useBotContext();
  
  // Take the last 30 digits for the stream
  const streamDigits = lastDigits.slice(0, 30);

  return (
    <div className="w-full p-4 border-t bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-start flex-row-reverse h-10 gap-2">
        {streamDigits.map((digit, index) => {
          const isEven = digit % 2 === 0;
          const isZero = digit === 0;
          const isMostRecent = index === 0;
          
          const colorClass = isZero 
            ? "bg-blue-600" // Azul para 0
            : isEven 
              ? "bg-green-600" // Verde para Par (2, 4, 6, 8)
              : "bg-red-600"; // Vermelho para Ímpar (1, 3, 5, 7, 9)
          
          return (
            <div 
              key={`${lastTickEpoch}-${index}`} // Key needs to be stable but update on new tick
              className={cn(
                "h-8 w-8 rounded-md flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md transition-all duration-300",
                colorClass,
                isMostRecent ? "scale-110 ring-2 ring-offset-2 ring-offset-background ring-primary animate-in fade-in-0 zoom-in-95" : "scale-100"
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