import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBotContext } from '@/context/BotContext';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MARKETS = [
    {
        "value": "1HZ10V",
        "label": "Vol 10 (1s)"
    },
    {
        "value": "1HZ25V",
        "label": "Vol 25 (1s)"
    },
    {
        "value": "1HZ50V",
        "label": "Vol 50 (1s)"
    },
    {
        "value": "1HZ75V",
        "label": "Vol 75 (1s)"
    },
    {
        "value": "1HZ100V",
        "label": "Vol 100 (1s)"
    },
    {
        "value": "R_10",
        "label": "Vol 10"
    },
    {
        "value": "R_25",
        "label": "Vol 25"
    },
    {
        "value": "R_50",
        "label": "Vol 50"
    },
    {
        "value": "R_75",
        "label": "Vol 75"
    },
    {
        "value": "R_100",
        "label": "Vol 100"
    }
];

interface MarketDigitsRowProps {
    marketLabel: string;
    digits: number[];
    isEvenIndex: boolean;
    getDigitColor: (digit: number) => string;
}

const MarketDigitsRow: React.FC<MarketDigitsRowProps> = ({
    marketLabel,
    digits,
    isEvenIndex,
    getDigitColor
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    };

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        updateScrollState();
        container.addEventListener('scroll', updateScrollState, { passive: true });

        // Converts vertical wheel scrolling over digit row into horizontal scrolling
        const handleWheel = (e: WheelEvent) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (delta !== 0) {
                const maxScroll = container.scrollWidth - container.clientWidth;
                if (maxScroll > 0) {
                    const isAtStart = container.scrollLeft <= 0 && delta < 0;
                    const isAtEnd = container.scrollLeft >= maxScroll && delta > 0;

                    if (!isAtStart && !isAtEnd) {
                        e.preventDefault();
                        e.stopPropagation();
                        container.scrollLeft += delta * 1.2;
                    }
                }
            }
        };

        // Mouse Drag to scroll
        let isDown = false;
        let startX = 0;
        let scrollLeftPos = 0;

        const handleMouseDown = (e: MouseEvent) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeftPos = container.scrollLeft;
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
            const walk = (x - startX) * 1.8;
            container.scrollLeft = scrollLeftPos - walk;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            container.removeEventListener('scroll', updateScrollState);
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('mouseleave', handleMouseLeave);
            container.removeEventListener('mouseup', handleMouseUp);
            container.removeEventListener('mousemove', handleMouseMove);
        };
    }, [digits.length]);

    const handleScrollClick = (amount: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
        <div className={cn(
            "flex flex-col gap-1 p-2 border-b border-white/5 relative group/row",
            isEvenIndex ? "bg-slate-800/20" : "bg-transparent"
        )}>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{marketLabel}</span>
                    {digits.length > 0 && (
                        <span className="text-[8px] text-slate-500 font-mono">({digits.length} ticks)</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {canScrollLeft && (
                        <button
                            type="button"
                            onClick={() => handleScrollClick(-150)}
                            className="h-4 w-4 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center transition-all active:scale-95"
                            title="Rolar para esquerda"
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </button>
                    )}
                    {canScrollRight && (
                        <button
                            type="button"
                            onClick={() => handleScrollClick(150)}
                            className="h-4 w-4 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center transition-all active:scale-95"
                            title="Rolar para direita"
                        >
                            <ChevronRight className="h-3 w-3" />
                        </button>
                    )}
                    <Badge variant="outline" className="text-[8px] bg-slate-900 border-white/10 px-1.5 py-0 h-4 font-mono text-cyan-300">
                        {digits.length > 0 ? `Tick: ${digits[0]}` : 'Aguardando...'}
                    </Badge>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-1 overflow-x-auto custom-scrollbar pb-1.5 pt-0.5 cursor-grab select-none touch-pan-x"
            >
                {digits.length > 0 ? (
                    digits.slice(0, 100).map((digit: number, i: number) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-5 h-5 flex items-center justify-center rounded-[3px] text-xs font-black shrink-0 bg-slate-950/70 border border-white/5 transition-all",
                                i === 0 ? "border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.4)] bg-cyan-950/30" : "",
                                getDigitColor(digit)
                            )}
                            title={`Tick #${i + 1}: ${digit}`}
                        >
                            {digit}
                        </div>
                    ))
                ) : (
                    <div className="text-[10px] text-slate-500 italic py-1">Sem dados. Verifique a conexão com a Deriv.</div>
                )}
            </div>
        </div>
    );
};

export const AllMarketsDigitsPanel = () => {
    const { multiMarketDigits, digitTradeMode, digitPrediction, overUnderDirection } = useBotContext();

    const getDigitColor = (digit: number) => {
        if (digitTradeMode === 'evenOdd') {
            return digit % 2 === 0 ? "text-blue-400" : "text-rose-400";
        }
        if (digitTradeMode === 'overUnder' && digitPrediction !== undefined) {
            if (overUnderDirection === 'OVER') {
                return digit > digitPrediction ? "text-emerald-400" : "text-rose-400";
            } else {
                return digit < digitPrediction ? "text-emerald-400" : "text-rose-400";
            }
        }
        return "text-slate-300";
    };

    return (        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md flex flex-col mt-4">
            <CardHeader className="py-2 px-3 border-b border-white/5 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-200">
                    <Activity className="h-3 w-3 text-cyan-400" />
                    Radar de Dígitos (Histórico de Mercados)
                </CardTitle>
                <Badge variant="outline" className="text-[8px] bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                    Arraste ou Role ↔ ↕
                </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
                    <div className="flex flex-col">
                        {MARKETS.map((market, index) => {
                            const digits = multiMarketDigits?.[market.value] || [];
                            return (
                                <MarketDigitsRow
                                    key={market.value}
                                    marketLabel={market.label}
                                    digits={digits}
                                    isEvenIndex={index % 2 === 0}
                                    getDigitColor={getDigitColor}
                                />
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

