"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, ShieldAlert, Timer, TrendingUp, Target, Radar, DollarSign, FileSpreadsheet, Settings, BrainCircuit, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QuickConfigModal } from './QuickConfigModal';
import { VirtualLossDisplay } from './VirtualLossDisplay';
import { Progress } from "@/components/ui/progress";
import { SettingsSheet } from './SettingsSheet';

export const AIOperatingScreen = () => {
    const { 
        selectedAIInfo, totalProfit, accountBalance, 
        isBotRunning, toggleBot, exitToSelection, 
        status, wins, losses, signals, clearSignals,
        handleConnect, accountType, realToken, demoToken,
        isPaused, pauseTimeRemaining,
        isManipulationDetected, neuralPredictions,
        isStudying, studyTicksCount, arbitrageGap
    } = useBotContext();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const isWin = totalProfit >= 0;
    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleStartClick = () => {
        if (isBotRunning) toggleBot();
        else setIsConfigModalOpen(true);
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    const getSignalLabel = (signal: string) => {
        switch (signal) {
            case 'EVEN': return { text: 'PAR', color: 'bg-green-50 text-green-600' };
            case 'ODD': return { text: 'ÍMPAR', color: 'bg-red-50 text-red-600' };
            default: return { text: signal, color: 'bg-gray-50 text-gray-600' };
        }
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* ALERTAS DE PROTEÇÃO E MODO DE ESTUDO */}
            {isStudying && (
                <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-blue-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">I.A Sincronizando Arbitragem</p>
                            <p className="text-xs font-bold text-blue-700">Mapeando novos desvios... ({studyTicksCount}/15)</p>
                        </div>
                    </div>
                    <div className="flex h-2 w-12 bg-blue-100 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(studyTicksCount / 15) * 100}%` }} />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/50 backdrop-blur-sm border-2 border-primary/20 rounded-2xl p-3 flex items-center gap-3">
                    <Radar className={cn("h-5 w-5 text-primary", isBotRunning && "animate-spin-slow")} />
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Scanner Gap</p>
                        <p className="text-xs font-black">+{arbitrageGap}%</p>
                    </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm border-2 border-green-500/20 rounded-2xl p-3 flex items-center gap-3">
                    <Activity className={cn("h-5 w-5 text-green-500", isBotRunning && "animate-pulse")} />
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Estabilidade</p>
                        <p className="text-xs font-black">{arbitrageGap > 25 ? 'ALTA' : 'NORMAL'}</p>
                    </div>
                </div>
            </div>

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
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                                    LUCRA & TIRA <DollarSign className="h-5 w-5 text-green-500" />
                                </h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-blue-500/10 text-blue-600 border-none">
                                    ARBITRAGEM NEURAL v2
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-blue-50 hover:text-blue-500">
                                    <FileSpreadsheet className="h-6 w-6" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500" onClick={exitToSelection}>
                                <Power className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    {/* REDE NEURAL - PREVISÃO DE DÍGITOS */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Scanner de Desvio Neural</p>
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

                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
                        )}
                    >
                        {isBotRunning ? "Pausar Arbitragem" : "Iniciar Arbitragem"}
                    </Button>

                    <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Lucro de Arbitragem</p>
                        <div className={cn("text-7xl font-black tracking-tighter", isWin ? "text-green-500" : "text-red-500")}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm"><Target className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Carteira Sniper</p>
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
                        {signals.length > 0 ? signals.map((s: any) => {
                            const label = getSignalLabel(s.signal);
                            return (
                                <tr key={s.id}>
                                    <td className="py-3 font-mono opacity-40">{s.timestamp}</td>
                                    <td className="py-3">
                                        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase", label.color)}>
                                            {label.text}
                                        </span>
                                    </td>
                                    <td className="py-3 text-center text-muted-foreground opacity-60 truncate max-w-[120px]">{s.details}</td>
                                    <td className={cn("py-3 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                        {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'SCANNING...'}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Arbitrage_Matrix_Synced</td></tr>
                        )}
                    </tbody>
                </table>
            </ScrollArea>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};