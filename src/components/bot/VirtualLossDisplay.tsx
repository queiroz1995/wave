"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VirtualLossDisplay = () => {
    const { virtualHistory = [], isBotRunning } = useBotContext();

    if (!isBotRunning) return null;

    const len = virtualHistory.length;
    const isPatternMatched = len >= 3 && 
                             virtualHistory[len - 3] === 'LOSS' && 
                             virtualHistory[len - 2] === 'LOSS' && 
                             virtualHistory[len - 1] === 'WIN';

    return (
        <Card className={cn(
            "mb-4 overflow-hidden rounded-2xl border-2 transition-all duration-500",
            isPatternMatched 
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                : "bg-primary/5 border-primary/20"
        )}>
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Target className={cn("h-4 w-4 animate-pulse", isPatternMatched ? "text-emerald-400" : "text-cyan-400")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isPatternMatched ? "text-emerald-400" : "text-primary")}>
                            {isPatternMatched ? "Gatilho Real Confirmado" : "Aguardando Padrão [L L W]"}
                        </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Histórico Virtual
                    </span>
                </div>
                
                {/* Histórico de Resultados Virtuais */}
                <div className="flex items-center gap-2 py-1">
                    {virtualHistory.length > 0 ? (
                        virtualHistory.map((outcome, index) => {
                            const isWin = outcome === 'WIN';
                            return (
                                <Badge 
                                    key={index} 
                                    className={cn(
                                        "h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs border transition-all duration-300",
                                        isWin 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                    )}
                                >
                                    {isWin ? 'W' : 'L'}
                                </Badge>
                            );
                        })
                    ) : (
                        <span className="text-[10px] text-muted-foreground italic">Aguardando primeiras simulações...</span>
                    )}
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-muted-foreground italic font-medium mt-3 pt-2 border-t border-white/5">
                    <span>
                        {isPatternMatched 
                            ? "Padrão detectado! Próxima entrada será com dinheiro real." 
                            : "Buscando sequência de 2 derrotas seguidas e 1 vitória..."}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-black animate-pulse">
                        <Zap className="h-3 w-3 fill-current" /> Sincronizando...
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};