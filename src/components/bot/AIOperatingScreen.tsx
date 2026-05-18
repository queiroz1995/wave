"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, ShieldAlert, Timer, TrendingUp, Target, Radar, DollarSign, FileSpreadsheet, Settings, BrainCircuit, Activity, Zap, Volume2, VolumeX, Swords } from 'lucide-react';
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
        isStudying, studyTicksCount, arbitrageGap,
        isSoundEnabled, setIsSoundEnabled,
        attackMode, setAttackMode
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

    const toggleAttackMode = (id: string) => {
        if (isBotRunning) return;
        
        setAttackMode((prev: string[]) => {
            if (prev.includes(id)) {
                // Não deixa ficar sem nenhum modo
                if (prev.length <= 1) return prev;
                return prev.filter(m => m !== id);
            }
            return [...prev, id];
        });
    };

    const getSignalLabel = (signal: string) => {
        switch (signal) {
            case 'EVEN': return { text: 'PAR', color: 'bg-green-50 text-green-600' };
            case 'ODD': return { text: 'ÍMPAR', color: 'bg-red-50 text-red-600' };
            case 'OVER': return { text: 'ACIMA', color: 'bg-blue-50 text-blue-600' };
            default: return { text: signal, color: 'bg-gray-50 text-gray-600' };
        }
    };

    const attackModes = [
        { id: 'traditional', label: 'TRADICIONAL', desc: 'Par / Ímpar' },
        { id: '3+', label: '3+', desc: 'Alta Frequência' },
        { id: '4+', label: '4+', desc: 'Equilibrado' },
        { id: '6+', label: '6+', desc: 'Alta Recompensa' },
    ];

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* SELETOR DE MODO DE ATAQUE - MULTIMODAL */}
            <div className="bg-white/40 backdrop-blur-md border border-white/60 p-1.5 rounded-[2rem] shadow-sm">
                <div className="grid grid-cols-4 gap-1">
                    {attackModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => toggleAttackMode(mode.id)}
                            disabled={isBotRunning}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 rounded-2xl transition-all duration-300",
                                attackMode.includes(mode.id) 
                                    ? "bg-primary text-white shadow-lg scale-100" 
                                    : "text-muted-foreground hover:bg-white/50 opacity-40",
                                isBotRunning && !attackMode.includes(mode.id) && "opacity-10"
                            )}
                        >
                            <span className="text-[9px] font-black tracking-widest">{mode.label}</span>
                            <span className="text-[7px] font-bold opacity-70 uppercase truncate w-full px-1">{mode.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* STATUS DO MODO ATIVO */}
            {isBotRunning && !isStudying && (
                <div className="bg-green-500/10 border-2 border-green-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-green-500/5">
                    <div className="flex items-center gap-3">
                        <Swords className="h-6 w-6 text-green-500 animate-pulse" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">NÚCLEO MULTIMODAL ATIVO</p>
                            <p className="text-xs font-bold text-green-700">Sincronizando {attackMode.length} estratégias...</p>
                        </div>
                    </div>
                </div>
            )}

            {isStudying && (
                <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="h-6 w-6 text-blue-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Aguardando Confirmação</p>
                            <p className="text-xs font-bold text-blue-700">Validando tendência... ({studyTicksCount}/5)</p>
                        </div>
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
                                    {selectedAIInfo?.name || 'WAVE AI'} <Zap className="h-5 w-5 text-blue-500 fill-current" />
                                </h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-blue-500/10 text-blue-600 border-none">
                                    {attackMode.length} MODOS ATIVOS
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-12 w-12 rounded-2xl hover:bg-gray-100"
                                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                            >
                                {isSoundEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
                            </Button>
                            
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

                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
                        )}
                    >
                        {isBotRunning ? "Parar Sistema" : "Iniciar Sistema"}
                    </Button>

                    <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Saldo Acumulado</p>
                        <div className={cn("text-7xl font-black tracking-tighter", isWin ? "text-green-500" : "text-red-500")}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm"><Target className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Carteira WAVE</p>
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
                                        {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'OPERANDO...'}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Scanner_WAVE_Active</td></tr>
                        )}
                    </tbody>
                </table>
            </ScrollArea>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};