"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Zap, Volume2, VolumeX, Cpu, DollarSign, FileSpreadsheet, RotateCcw, MessageSquare, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickConfigModal } from './QuickConfigModal';
import { SettingsSheet } from './SettingsSheet';

export const AIOperatingScreen = () => {
    const { 
        selectedAIInfo, totalProfit, accountBalance, 
        isBotRunning, toggleBot, resetOperations, exitToSelection, 
        status, signals,
        handleConnect, accountType, realToken, demoToken,
        isPaused, isManipulationDetected,
        isStudying, studyTicksCount,
        isSoundEnabled, setIsSoundEnabled,
        currentConfidence,
        aiThought
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

    const getSignalLabel = (signal: string, strategy: string) => {
        const isVirtual = strategy.includes('VIRTUAL');
        let baseColor = '';
        let text = '';

        switch (signal) {
            case 'EVEN': 
                text = 'PAR'; 
                baseColor = isVirtual ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-green-50 text-green-600 border-green-100';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-red-50 text-red-600 border-red-100';
                break;
            case 'CALL': 
                text = 'SOBE'; 
                baseColor = isVirtual ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-green-50 text-green-600 border-green-100';
                break;
            case 'PUT': 
                text = 'DESCE'; 
                baseColor = isVirtual ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-red-50 text-red-600 border-red-100';
                break;
            default: 
                text = signal; 
                baseColor = 'bg-gray-50 text-gray-500 border-gray-100';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 px-3 pb-10">
            
            {/* HUD de Status - Estilo Pílula */}
            <div className="flex items-center justify-between bg-white/40 backdrop-blur-md border border-white/60 p-2 px-4 rounded-full shadow-sm">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", isBotRunning ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {isBotRunning ? (isStudying ? "Sincronizando" : "Sniper Ativo") : "Standby"}
                    </span>
                </div>
                {isBotRunning && !isStudying && (
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-0.5 rounded-full border border-primary/20">
                        <Activity className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-black text-primary">{currentConfidence}%</span>
                    </div>
                )}
            </div>

            {/* Card Principal - Premium Glass */}
            <Card className="bg-white/80 backdrop-blur-2xl border-white/40 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                
                <CardContent className="p-8 space-y-8">
                    {/* Header do Robô */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-sm" />
                                <div className="h-14 w-14 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-hidden relative">
                                    {selectedAIInfo?.image ? (
                                        <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-50"><Bot className="h-6 w-6 text-primary" /></div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tighter italic leading-none">WAVE SNIPER</h2>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1">Neural Core v2.0</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-50/50">
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100" onClick={exitToSelection}>
                                <Power className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Display de Lucro - O Herói da Tela */}
                    <div className="text-center py-4 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mb-2">Lucro da Sessão</p>
                        <div className={cn(
                            "text-7xl font-black tracking-tighter leading-none transition-all duration-500",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-3xl opacity-30 mr-1 font-light">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Botão de Ação - Grande e Tátil */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2.5rem] text-xl font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-xl",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                                : "bg-primary hover:bg-primary/90 shadow-primary/20 animate-pulse-bright"
                        )}
                    >
                        {isBotRunning ? "PARAR" : "INICIAR"}
                    </Button>

                    {/* Saldo - Estilo Carteira Digital */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2.5rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3.5 rounded-2xl shadow-inner",
                                accountType === 'real' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                            )}>
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Saldo</p>
                                <p className="text-2xl font-black tracking-tight">${accountBalance?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-gray-100" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Pensamento da IA - Estilo Terminal */}
            {isBotRunning && (
                <div className="bg-slate-900 rounded-[2rem] p-4 flex items-start gap-3 shadow-lg border border-white/10">
                    <MessageSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black text-primary/60 uppercase tracking-widest mb-1">Neural_Thought</p>
                        <p className="text-xs font-mono text-blue-50 leading-relaxed">
                            {aiThought}
                            <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
                        </p>
                    </div>
                </div>
            )}

            {/* Histórico de Sinais - Clean & Modern */}
            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2.5rem] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Monitor de Sinais</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={resetOperations}>
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
                <ScrollArea className="h-44">
                    <div className="space-y-3">
                        {signals.length > 0 ? signals.map((s: any) => {
                            const label = getSignalLabel(s.signal, s.strategy);
                            const hasFinished = typeof s.profit === 'number';
                            
                            return (
                                <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-mono text-muted-foreground/40">{s.timestamp}</span>
                                        <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border", label.color)}>
                                            {label.text}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-black", 
                                        !hasFinished ? "text-primary animate-pulse" : (s.result === 'WIN' ? "text-green-500" : "text-red-500")
                                    )}>
                                        {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] italic">Aguardando Sinais Neurais...</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};