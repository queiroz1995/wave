"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, ShieldAlert, Timer, TrendingUp, Target, Radar, DollarSign, FileSpreadsheet, Settings, BrainCircuit } from 'lucide-react';
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
        probabilities, isPaused, pauseTimeRemaining, learningData,
        isManipulationDetected, neuralPredictions,
        isStudying, studyTicksCount
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
            case 'OVER': return { text: 'ACIMA', color: 'bg-blue-50 text-blue-600' };
            case 'UNDER': return { text: 'ABAIXO', color: 'bg-orange-50 text-orange-600' };
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">I.A em Modo de Estudo</p>
                            <p className="text-xs font-bold text-blue-700">Aguardando novo fluxo... ({studyTicksCount}/10)</p>
                        </div>
                    </div>
                    <div className="flex h-2 w-12 bg-blue-100 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(studyTicksCount / 10) * 100}%` }} />
                    </div>
                </div>
            )}

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
                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl p-5 flex items-center justify-between shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center gap-3 text-emerald-600">
                        <div className="bg-emerald-500 p-2 rounded-xl text-white">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Modo Trava de Lucro</p>
                            <p className="text-xs font-bold text-emerald-700/80">Aguardando gatilho de alta assertividade...</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-black text-2xl text-emerald-600">
                        <Timer className="h-5 w-5 animate-spin-slow" />
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
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                                    LUCRA & TIRA <DollarSign className="h-5 w-5 text-green-500" />
                                </h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-green-500/10 text-green-600 border-none">
                                    HIT & RUN ENGINE ACTIVE
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
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Previsão de Explosão Neural</p>
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
                        <div className="space-y-2 p-4 bg-green-50/30 rounded-2xl border border-green-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-green-700 tracking-widest">
                                <span>WIN_RATE</span>
                                <span className="text-green-500">{wins > 0 ? ((wins / (wins+losses)) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <Progress value={wins > 0 ? (wins / (wins+losses)) * 100 : 0} className="h-1.5 [&>div]:bg-green-500" />
                        </div>
                        <div className="space-y-2 p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-blue-700 tracking-widest">
                                <span>ALVO_12X</span>
                                <span className="text-blue-500">ONLINE</span>
                            </div>
                            <Progress value={100} className="h-1.5 [&>div]:bg-blue-500" />
                        </div>
                    </div>

                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : "bg-green-600 hover:bg-green-700 shadow-green-500/30"
                        )}
                    >
                        {isBotRunning ? "Pausar Lucro" : "Iniciar Operação"}
                    </Button>

                    <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Saldo em Operação</p>
                        <div className={cn("text-7xl font-black tracking-tighter", isWin ? "text-green-500" : "text-red-500")}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
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
                                    <td className="py-3 text-center text-muted-foreground opacity-60 truncate max-w-[80px]">{s.details}</td>
                                    <td className={cn("py-3 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                        {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'ANALISANDO...'}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Neural_Link_Synced</td></tr>
                        )}
                    </tbody>
                </table>
            </ScrollArea>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};