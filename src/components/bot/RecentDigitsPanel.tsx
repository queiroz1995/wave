"use client";

import React, { useEffect, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Zap, BarChart3 } from 'lucide-react';

type Period = 30 | 40 | 60 | 100;

export const RecentDigitsPanel = () => {
    const { lastDigits } = useBotContext();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const getMaxStreak = (digits: number[], type: 'even' | 'odd') => {
        let maxStreak = 0;
        let currentStreak = 0;
        const chronological = [...digits].reverse();

        for (const digit of chronological) {
            const isEven = digit % 2 === 0;
            const matches = type === 'even' ? isEven : !isEven;

            if (matches) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return maxStreak;
    };

    const periodStats: Record<Period, { even: number; odd: number }> = {
        30: {
            even: getMaxStreak(lastDigits.slice(0, 30), 'even'),
            odd: getMaxStreak(lastDigits.slice(0, 30), 'odd'),
        },
        40: {
            even: getMaxStreak(lastDigits.slice(0, 40), 'even'),
            odd: getMaxStreak(lastDigits.slice(0, 40), 'odd'),
        },
        60: {
            even: getMaxStreak(lastDigits.slice(0, 60), 'even'),
            odd: getMaxStreak(lastDigits.slice(0, 60), 'odd'),
        },
        100: {
            even: getMaxStreak(lastDigits.slice(0, 100), 'even'),
            odd: getMaxStreak(lastDigits.slice(0, 100), 'odd'),
        },
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        const handleMouseDown = (e: MouseEvent) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        };

        const handleMouseLeave = () => {
            isDown = false;
            container.style.cursor = 'grab';
        };

        const handleMouseUp = () => {
            isDown = false;
            container.style.cursor = 'grab';
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            container.scrollLeft = scrollLeft - (x - startX) * 1.5;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('mouseleave', handleMouseLeave);
            container.removeEventListener('mouseup', handleMouseUp);
            container.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="w-full bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute inset-0 ai-scanline opacity-5 pointer-events-none" />

            <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            Histórico de Resultados
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([30, 40, 60, 100] as Period[]).map((period) => (
                        <div
                            key={period}
                            className="rounded-xl border border-white/5 bg-white/5 p-2.5 flex flex-col items-center justify-center gap-2"
                        >
                            <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                <BarChart3 className="h-2.5 w-2.5 text-cyan-400" />
                                {period} Rodadas
                            </span>

                            <div className="flex w-full items-center justify-center gap-1.5">
                                <div className="flex min-w-[38px] flex-col items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
                                    <span className="text-[7px] font-black uppercase text-emerald-400">Par</span>
                                    <span className="font-mono text-xs font-black text-emerald-400">
                                        {periodStats[period].even}x
                                    </span>
                                </div>
                                <div className="flex min-w-[38px] flex-col items-center rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1">
                                    <span className="text-[7px] font-black uppercase text-rose-400">Ímp</span>
                                    <span className="font-mono text-xs font-black text-rose-400">
                                        {periodStats[period].odd}x
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    id="digits-scroll-container"
                    ref={scrollContainerRef}
                    className="flex w-full flex-row flex-nowrap gap-2 overflow-x-scroll py-1 cursor-grab select-none touch-pan-x scrollbar-none"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <style dangerouslySetInnerHTML={{ __html: `
                        #digits-scroll-container::-webkit-scrollbar {
                            display: none !important;
                            width: 0 !important;
                            height: 0 !important;
                        }
                    `}} />

                    {lastDigits.length > 0 ? (
                        lastDigits.map((digit: number, index: number) => {
                            const isEven = digit % 2 === 0;
                            const isZero = digit === 0;

                            return (
                                <div
                                    key={`${index}-${digit}`}
                                    className={cn(
                                        "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-300",
                                        isZero
                                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                            : isEven
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                    )}
                                >
                                    <span className="font-mono text-sm font-black leading-none">
                                        {digit}
                                    </span>
                                    <span className="mt-1 text-[7px] font-black uppercase tracking-tighter opacity-60">
                                        {isZero ? 'Zero' : isEven ? 'Par' : 'Ímp'}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        Array.from({ length: 12 }).map((_, index) => (
                            <div
                                key={`empty-${index}`}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5"
                            >
                                <span className="font-mono text-xs font-bold text-slate-600">-</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};