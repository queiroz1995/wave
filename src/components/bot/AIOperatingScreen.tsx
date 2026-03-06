"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, Brain, Activity, ShieldAlert, Timer } from 'lucide-react';
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
        status, tradeStatus, wins, losses, signals, clearSignals,
        handleConnect, accountType, realToken, demoToken,
        probabilities, isPaused, pauseTimeRemaining
    } = useBotContext();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const isWin = totalProfit >= 0;
    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleStartClick = () => {
        if (isBotRunning) {
            toggleBot();
        } else {
            setIsConfigModalOpen(true);
        }
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* MONITOR DE STATUS AVANÇADO */}
            {isPaused && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3 text-red-500">
                        <ShieldAlert className="h-6 w-6" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Proteção Anti-Loss Ativa</p>
                            <p className="text-xs font-bold">Resfriando sistema após 3 perdas...</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-black text-xl text-red-500">
                        <Timer className="h-5 w-5" />
                        {Math.floor(pauseTimeRemaining / 60)}:{(pauseTimeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            )}

            <VirtualLossDisplay />

            {/* CARD PRINCIPAL */}
            <Card className="glass-panel border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden rounded-[3rem]">
                <CardContent className="p-10 space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl overflow-hidden border-2 border-white/50 shadow-sm">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Bot className="h-7 w-7 text-primary" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedAIInfo?.name || 'Neural Core'}</h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-primary/5 text-primary border-none">
                                    VORTEX-PRO ENGINE
                                </Badge>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500" onClick={exitToSelection}>
                            <Power className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* TELEMETRIA NEURAL EM TEMPO REAL */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                <span>IA_EVEN</span>
                                <span className="text-green-500">{probabilities.even.toFixed(1)}%</span>
                            </div>
                            <Progress value={probabilities.even} className="h-1.5 [&>div]:bg-green-500" />
                        </div>
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                <span>IA_ODD</span>
                                <span className="text-red-500">{probabilities.odd.toFixed(1)}%</span>
                            </div>
                            <Progress value={probabilities.odd} className="h-1.5 [&>div]:bg-red-500" />
                        </div>
                    </div>

                    {/* Botão de Ação */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30 scale-[0.98]" 
                                : "bg-primary hover:bg-primary/90 shadow-primary/30"
                        )}
                    >
                        {isBotRunning ? "Interromper" : "Play Operação"}
                    </Button>

                    {/* Display de Lucro */}
                    <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Live Profit</p>
                        <div className={cn(
                            "text-7xl font-black tracking-tighter flex items-center justify-center gap-3",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Saldo */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm">
                                <RefreshCw className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Saldo em Conta</p>
                                <p className="text-xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'} <span className="text-xs font-bold opacity-40">USD</span></p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Status Steps */}
            <div className="grid grid-cols-3 gap-3 px-2">
                {[
                    { label: 'Neural_Analyse', active: isBotRunning && tradeStatus === 'IDLE', icon: Brain },
                    { label: 'Score_Signal', active: tradeStatus === 'SENDING', icon: Activity },
                    { label: 'Execution', active: tradeStatus === 'ACTIVE', icon: RefreshCw }
                ].map((step, i) => (
                    <div key={i} className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-500",
                        step.active ? "bg-white shadow-lg border-primary/20 scale-105" : "bg-white/40 border-transparent opacity-40"
                    )}>
                        <step.icon className={cn("h-4 w-4", step.active ? "text-primary animate-pulse" : "text-gray-400")} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">{step.label}</span>
                    </div>
                ))}
            </div>

            {/* Histórico Simplificado */}
            <Card className="glass-panel border-none rounded-[2.5rem] overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-gray-50/30">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log_Data_Relatory</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 text-[11px] font-black">
                            <span className="text-green-500">W: {wins}</span>
                            <span className="text-red-500">L: {losses}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={clearSignals}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <ScrollArea className="h-48 px-6 pb-6">
                    <table className="w-full text-[10px] font-bold">
                        <tbody className="divide-y divide-gray-50">
                            {signals.length > 0 ? signals.map((s: any) => (
                                <tr key={s.id}>
                                    <td className="py-3 font-mono opacity-40">{s.timestamp}</td>
                                    <td className="py-3">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                                            s.signal === 'EVEN' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {s.signal === 'EVEN' ? 'PAR' : 'ÍMPAR'}
                                        </span>
                                    </td>
                                    <td className="py-3 text-center text-muted-foreground opacity-60">{s.winRate}</td>
                                    <td className={cn("py-3 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                        {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Standby_Neural_Link</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </Card>

            <QuickConfigModal 
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onConfirm={confirmStart}
            />
        </div>
    );
};