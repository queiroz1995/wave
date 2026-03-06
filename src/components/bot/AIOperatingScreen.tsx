"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, ShieldAlert, Timer, TrendingUp, Target, Radar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QuickConfigModal } from './QuickConfigModal';
import { VirtualLossDisplay } from './VirtualLossDisplay';
import { Progress } from "@/components/ui/progress";

export const AIOperatingScreen = () => {
    const { 
        selectedAIInfo, totalProfit, accountBalance, 
        isBotRunning, toggleBot, exitToSelection, 
        status, wins, losses, signals, clearSignals,
        handleConnect, accountType, realToken, demoToken,
        probabilities, isPaused, pauseTimeRemaining, learningData,
        isManipulationDetected, neuralPredictions
    } = useBotContext();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const isWin = totalProfit >= 0;
    const currentToken = accountType === 'real' ? realToken : demoToken;

    // Calcular insights de aprendizado
    const patterns = Object.entries(learningData || {}).map(([name, stats]: [string, any]) => ({
        name,
        winrate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        total: stats.total
    })).sort((a, b) => b.winrate - a.winrate);

    const handleStartClick = () => {
        if (isBotRunning) toggleBot();
        else setIsConfigModalOpen(true);
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* ALERTAS DE PROTEÇÃO */}
            {isManipulationDetected && (
                <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                    <Radar className="h-6 w-6 text-orange-500" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Manipulação Detectada</p>
                        <p className="text-xs font-bold">Bloqueio temporário ativo por segurança.</p>
                    </div>
                </div>
            )}

            {isPaused && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-red-500">
                        <ShieldAlert className="h-6 w-6" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Sniper Offline</p>
                            <p className="text-xs font-bold">Recuperando sinal após perda...</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-black text-xl text-red-500">
                        <Timer className="h-5 w-5" />
                        {Math.floor(pauseTimeRemaining / 60)}:{(pauseTimeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            )}

            <VirtualLossDisplay />

            <Card className="glass-panel border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden rounded-[3rem]">
                <CardContent className="p-10 space-y-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl overflow-hidden border-2 border-white/50 shadow-sm">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Bot className="h-7 w-7 text-primary" /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">SNIPER V3</h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-primary/5 text-primary border-none">
                                    LEARNING ENGINE PRO
                                </Badge>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500" onClick={exitToSelection}>
                            <Power className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* REDE NEURAL - PREVISÃO DE DÍGITOS */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Previsão Neural (0-9)</p>
                        <div className="flex gap-1 h-12 items-end">
                            {neuralPredictions.map((val, idx) => (
                                <div key={idx} className="flex-1 flex flex-col gap-1 items-center">
                                    <div 
                                        className={cn(
                                            "w-full rounded-t-sm transition-all duration-300",
                                            idx % 2 === 0 ? "bg-green-500/40" : "bg-red-500/40",
                                            val > 15 && "bg-primary/60 shadow-[0_0_8px_hsl(var(--primary))]"
                                        )} 
                                        style={{ height: `${val * 3}%` }} 
                                    />
                                    <span className="text-[8px] font-bold">{idx}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                <span>PROB_EVEN</span>
                                <span className="text-green-500">{probabilities.even.toFixed(1)}%</span>
                            </div>
                            <Progress value={probabilities.even} className="h-1.5 [&>div]:bg-green-500" />
                        </div>
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                <span>PROB_ODD</span>
                                <span className="text-red-500">{probabilities.odd.toFixed(1)}%</span>
                            </div>
                            <Progress value={probabilities.odd} className="h-1.5 [&>div]:bg-red-500" />
                        </div>
                    </div>

                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : "bg-primary hover:bg-primary/90 shadow-primary/30"
                        )}
                    >
                        {isBotRunning ? "Abortar Sniper" : "Iniciar Sniper IA"}
                    </Button>

                    <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Profit Session</p>
                        <div className={cn("text-7xl font-black tracking-tighter", isWin ? "text-green-500" : "text-red-500")}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* AI LEARNING INSIGHTS (REINTEGRADO) */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                            <TrendingUp className="h-3 w-3" /> Padrões Memorizados
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {patterns.length > 0 ? patterns.slice(0, 2).map(p => (
                                <div key={p.name} className="p-2 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
                                    <p className="text-[8px] font-black opacity-40 uppercase">{p.name}</p>
                                    <p className={cn("text-xs font-black", p.winrate >= 60 ? "text-green-500" : p.winrate < 50 ? "text-red-500" : "text-primary")}>
                                        {p.winrate.toFixed(1)}% <span className="text-[8px] opacity-40">({p.total} op)</span>
                                    </p>
                                </div>
                            )) : (
                                <div className="col-span-2 py-4 text-center text-[8px] font-bold text-muted-foreground opacity-30 uppercase">Calibrando base de dados...</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm"><Target className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Carteira Ativa</p>
                                <p className="text-xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'} <span className="text-xs font-bold opacity-40">USD</span></p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ScrollArea className="h-48 px-2">
                <table className="w-full text-[10px] font-bold">
                    <tbody className="divide-y divide-gray-50">
                        {signals.length > 0 ? signals.map((s: any) => (
                            <tr key={s.id}>
                                <td className="py-3 font-mono opacity-40">{s.timestamp}</td>
                                <td className="py-3"><span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase", s.signal === 'EVEN' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{s.signal === 'EVEN' ? 'PAR' : 'ÍMPAR'}</span></td>
                                <td className="py-3 text-center text-muted-foreground opacity-60 truncate max-w-[80px]">{s.details}</td>
                                <td className={cn("py-3 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                    {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'SCANNING...'}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Neural_Link_Synced</td></tr>
                        )}
                    </tbody>
                </table>
            </ScrollArea>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};