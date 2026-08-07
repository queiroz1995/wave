"use client";

import React, { useEffect, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Zap, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { isDigitVirtualLoss as checkDigitVirtualLoss } from '@/utils/virtualLossHelper';

type Period = 30 | 40 | 60 | 100;

export const RecentDigitsPanel = () => {
    const { 
        lastDigits, currentLiveTick, asset, manualBuy, tradeStatus, 
        digitTradeMode, digitPrediction, overUnderDirection, isConnected,
        virtualTargetLosses, isSmartModeActive 
    } = useBotContext();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const targetLosses = isSmartModeActive ? 1 : virtualTargetLosses;

    const isDigitVirtualLoss = (digit: number): boolean => {
        return checkDigitVirtualLoss(digit, digitTradeMode, Number(digitPrediction) || 4, overUnderDirection);
    };

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
                <div className="flex items-center justify-between px-0.5 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Zap className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em]">
                            Dígitos Deriv ({asset || 'R_100'})
                        </span>
                    </div>

                    {currentLiveTick !== null && currentLiveTick !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wider shadow-lg transition-all duration-300",
                            currentLiveTick === 0
                                ? "border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-blue-500/10"
                                : currentLiveTick % 2 === 0
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10"
                                    : "border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-rose-500/10"
                        )}>
                            <span className="text-[8px] text-slate-400 uppercase font-bold">Ao Vivo:</span>
                            <span className="font-mono text-xs font-black">{currentLiveTick}</span>
                            <span className="text-[8px] uppercase font-bold">
                                ({currentLiveTick === 0 ? 'Zero' : currentLiveTick % 2 === 0 ? 'PAR' : 'ÍMPAR'})
                            </span>
                        </div>
                    )}
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
                    className="flex w-full flex-row flex-nowrap gap-2 overflow-x-auto py-2 cursor-grab select-none touch-pan-x custom-scrollbar"
                >
                    {lastDigits.length > 0 ? (
                        lastDigits.map((digit: number, index: number) => {
                            const isEven = digit % 2 === 0;
                            const isZero = digit === 0;
                            const isLoss = isDigitVirtualLoss(digit);

                            return (
                                <div
                                    key={`${index}-${digit}`}
                                    className={cn(
                                        "relative flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-300",
                                        index === 0 ? "ring-2 ring-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "",
                                        isLoss 
                                            ? "border-rose-500/40 bg-rose-500/10 text-rose-300" 
                                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    )}
                                    title={`Tick #${index + 1}: Dígito ${digit} -> ${isLoss ? 'LOSS VIRTUAL ❌' : 'WIN VIRTUAL 🟢'}`}
                                >
                                    <span className="font-mono text-sm font-black leading-none">
                                        {digit}
                                    </span>
                                    <span className="mt-0.5 text-[6px] font-black uppercase tracking-tighter opacity-80">
                                        {isZero ? 'Zero' : isEven ? 'Par' : 'Ímp'}
                                    </span>
                                    {/* Tag de Loss Virtual */}
                                    <span className={cn(
                                        "absolute -bottom-1 -right-1 text-[7px] font-black leading-none px-1 py-0.5 rounded-md border shadow-sm",
                                        isLoss 
                                            ? "bg-rose-600 text-white border-rose-400" 
                                            : "bg-emerald-600 text-white border-emerald-400"
                                    )}>
                                        {isLoss ? 'L' : 'W'}
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

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                        type="button"
                        onClick={() => manualBuy(digitTradeMode === 'overUnder' ? 'DIGITOVER' : 'DIGITEVEN', 'Entrada Manual')}
                        disabled={!isConnected || tradeStatus === 'ACTIVE' || tradeStatus === 'SENDING'}
                        className={cn(
                            "h-10 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            digitTradeMode === 'overUnder' 
                                ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        )}
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {digitTradeMode === 'overUnder' ? `OVER ${digitPrediction}` : 'PAR'}
                    </button>
                    <button
                        type="button"
                        onClick={() => manualBuy(digitTradeMode === 'overUnder' ? 'DIGITUNDER' : 'DIGITODD', 'Entrada Manual')}
                        disabled={!isConnected || tradeStatus === 'ACTIVE' || tradeStatus === 'SENDING'}
                        className={cn(
                            "h-10 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            digitTradeMode === 'overUnder' 
                                ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                        )}
                    >
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        {digitTradeMode === 'overUnder' ? `UNDER ${digitPrediction}` : 'ÍMPAR'}
                    </button>
                </div>
            </div>
        </div>
    );
};