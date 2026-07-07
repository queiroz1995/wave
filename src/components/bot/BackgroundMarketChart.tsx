"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

export const BackgroundMarketChart = () => {
    const { lastDigits } = useBotContext();
    
    // Pegamos os últimos 40 dígitos para compor o gráfico de fundo
    const displayDigits = [...lastDigits].slice(0, 40).reverse();

    return (
        <div className="absolute inset-0 flex items-end gap-[2px] px-4 pb-4 pointer-events-none opacity-[0.08]">
            {displayDigits.map((digit, i) => {
                const isEven = digit % 2 === 0;
                // Calculamos a altura baseada no dígito (0-9)
                const height = `${(digit + 1) * 10}%`;
                
                return (
                    <div 
                        key={i}
                        className={cn(
                            "flex-1 rounded-t-sm transition-all duration-500 ease-in-out",
                            isEven ? "bg-green-500" : "bg-red-500"
                        )}
                        style={{ height }}
                    />
                );
            })}
        </div>
    );
};