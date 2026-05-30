"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';

export const RecentDigitsPanel = () => {
    const { lastDigits, lastTickEpoch } = useBotContext();
    
    // Pegamos exatamente os 8 dígitos mais recentes
    const recentDigits = lastDigits.slice(0, 8);

    return (
        <div className="w-full bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            {/* Efeito de varredura de fundo */}
            <div className="absolute inset-0 ai-scanline opacity-5 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimos 8 Dígitos</span>
                </div>
                <div className="flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    <Activity className="h-2.5 w-2.5 text-cyan-400 animate-pulse" />
                    <span className="text-[8px] font-black text-cyan-400 uppercase tracking-wider">Live Stream</span>
                </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5 py-1">
                {recentDigits.length > 0 ? (
                    recentDigits.map((digit: number, index: number) => {
                        const isEven = digit % 2 === 0;
                        const isZero = digit === 0;
                        const isMostRecent = index === 0;

                        return (
                            <div 
                                key={`${lastTickEpoch}-${index}`}
                                className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-500 relative overflow-hidden",
                                    isZero 
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                        : isEven 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                                            : "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
                                    isMostRecent && "scale-110 ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 z-10"
                                )}
                            >
                                {/* Brilho interno para o mais recente */}
                                {isMostRecent && (
                                    <div className="absolute inset-0 bg-cyan-400/5 animate-pulse" />
                                )}
                                
                                <span className={cn(
                                    "text-lg font-black font-mono leading-none",
                                    isMostRecent ? "text-xl" : "opacity-80"
                                )}>
                                    {digit}
                                </span>
                                
                                <span className="text-[7px] font-black uppercase tracking-tighter mt-1 opacity-60">
                                    {isZero ? 'Zero' : isEven ? 'Par' : 'Ímp'}
                                </span>

                                {/* Badge flutuante para o mais recente */}
                                {isMostRecent && (
                                    <span className="absolute top-0.5 right-0.5 flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                                    </span>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-8 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                        Aguardando ticks...
                    </div>
                )}
            </div>
        </div>
    );
};