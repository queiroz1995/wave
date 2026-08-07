import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBotContext } from '@/context/BotContext';
import { Activity, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
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

import { isDigitVirtualLoss, getMarketVirtualLossStreak } from '@/utils/virtualLossHelper';

interface MarketDigitsRowProps {
    marketLabel: string;
    marketKey: string;
    digits: number[];
    isEvenIndex: boolean;
    getDigitColor: (digit: number) => string;
    digitTradeMode: string;
    digitPrediction: number;
    overUnderDirection: string;
    targetLosses: number;
}

const MarketDigitsRow: React.FC<MarketDigitsRowProps> = ({
    marketLabel,
    marketKey,
    digits,
    isEvenIndex,
    getDigitColor,
    digitTradeMode,
    digitPrediction,
    overUnderDirection,
    targetLosses
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const consecutiveLosses = digits.length > 0
        ? getMarketVirtualLossStreak(digits, digitTradeMode, digitPrediction, overUnderDirection)
        : 0;

    const isReadyForEntry = targetLosses > 0 && consecutiveLosses >= targetLosses;

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
            "flex flex-col gap-1 p-2 border-b border-white/5 relative group/row transition-all duration-300",
            isReadyForEntry 
                ? "bg-emerald-500/10 border-l-4 border-l-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
                : isEvenIndex ? "bg-slate-800/20" : "bg-transparent"
        )}>
            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{marketLabel}</span>
                    {digits.length > 0 && (
                        <span className="text-[8px] text-slate-500 font-mono">({digits.length} ticks)</span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Badge de Loss Virtual do Mercado */}
                    {targetLosses > 0 && (
                        <Badge variant="outline" className={cn(
                            "text-[8px] font-mono font-bold px-1.5 py-0 h-4 transition-all duration-300 flex items-center gap-1",
                            isReadyForEntry 
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                : consecutiveLosses > 0 
                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                    : "bg-slate-900/80 text-slate-400 border-white/10"
                        )}>
                            <span>Loss Virt.: {consecutiveLosses}/{targetLosses}</span>
                            {isReadyForEntry && <span className="text-[7px] font-black uppercase text-emerald-400">⚡ PRONTO</span>}
                        </Badge>
                    )}

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

            {/* Stream de dígitos com indicador de Loss Virtual em cada um */}
            <div
                ref={scrollRef}
                className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1.5 pt-0.5 cursor-grab select-none touch-pan-x"
            >
                {digits.length > 0 ? (
                    digits.slice(0, 100).map((digit: number, i: number) => {
                        const isLoss = isDigitVirtualLoss(digit, digitTradeMode, digitPrediction, overUnderDirection);
                        return (
                            <div 
                                key={i} 
                                className={cn(
                                    "relative w-6 h-6 flex flex-col items-center justify-center rounded-[4px] text-xs font-black shrink-0 transition-all group/digit",
                                    i === 0 ? "ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] z-10" : "",
                                    isLoss 
                                        ? "bg-rose-950/60 border border-rose-500/40 text-rose-300" 
                                        : "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                                )}
                                title={`Tick #${i + 1}: Dígito ${digit} -> ${isLoss ? 'LOSS VIRTUAL ❌' : 'WIN VIRTUAL 🟢'}`}
                            >
                                <span className="leading-none">{digit}</span>
                                <span className={cn(
                                    "absolute -bottom-1 -right-0.5 text-[6px] font-black leading-none px-0.5 rounded",
                                    isLoss ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                                )}>
                                    {isLoss ? 'L' : 'W'}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-[10px] text-slate-500 italic py-1">Sem dados. Verifique a conexão com a Deriv.</div>
                )}
            </div>
        </div>
    );
};

export const AllMarketsDigitsPanel = () => {
    const { multiMarketDigits, digitTradeMode, digitPrediction, overUnderDirection, asset, virtualTargetLosses, isSmartModeActive } = useBotContext();
    const [isHidden, setIsHidden] = useState<boolean>(() => {
        return localStorage.getItem('panel_hide_digits_radar') === 'true';
    });

    const toggleHidden = (hidden: boolean) => {
        setIsHidden(hidden);
        localStorage.setItem('panel_hide_digits_radar', String(hidden));
    };

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

    const targetLosses = isSmartModeActive ? 1 : virtualTargetLosses;

    if (isHidden) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-white/10 rounded-xl mt-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Radar de Dígitos (10 Mercados Ativos)</span>
                </div>
                <button
                    onClick={() => toggleHidden(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Mostrar Radar de Dígitos"
                >
                    <EyeOff className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-md flex flex-col mt-4">
            <CardHeader className="py-2.5 px-3 border-b border-white/5 flex flex-col gap-1.5 shrink-0">
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-200">
                        <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                        <span>Radar Quântico (10 Mercados Simultâneos)</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                            Filtro Virtual: {targetLosses > 0 ? `${targetLosses} Loss` : 'Desativado'}
                        </Badge>
                        <button
                            onClick={() => toggleHidden(true)}
                            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Ocultar Painel"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-2 py-1 flex items-center justify-between text-[9px] text-cyan-300">
                    <span>⚡ O radar analisa os 10 mercados e faz a entrada no 1º que validar a estratégia com loss virtual.</span>
                    <span className="font-mono text-cyan-400 font-bold shrink-0 ml-2">Ativo Atual: {asset}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
                    <div className="flex flex-col">
                        {MARKETS.map((market, index) => {
                            const digits = multiMarketDigits?.[market.value] || [];
                            return (
                                <MarketDigitsRow
                                    key={market.value}
                                    marketKey={market.value}
                                    marketLabel={`${market.label}${market.value === asset ? ' (Foco)' : ''}`}
                                    digits={digits}
                                    isEvenIndex={index % 2 === 0}
                                    getDigitColor={getDigitColor}
                                    digitTradeMode={digitTradeMode}
                                    digitPrediction={digitPrediction}
                                    overUnderDirection={overUnderDirection}
                                    targetLosses={targetLosses}
                                />
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

