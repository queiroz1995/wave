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
                baseColor = isVirtual ? 'text-blue-500' : 'text-green-600';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'text-blue-500' : 'text-red-500';
                break;
            default: 
                text = signal; 
                baseColor = 'text-gray-500';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-500 px-2 sm:px-0 pb-10">
            
            {/* Status Bar Minimalista */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", isBotRunning ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isBotRunning ? (isStudying ? "Sincronizando..." : "Sistema Ativo") : "Standby"}
                    </span>
                </div>
                {isBotRunning && !isStudying && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                        <Activity className="h-3 w-3" />
                        <span>{currentConfidence}%</span>
                    </div>
                )}
            </div>

            {/* Card Principal - Ultra Light */}
            <Card className="bg-white/60 backdrop-blur-md border-white/40 shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 space-y-6">
                    {/* Header Compacto */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Bot className="h-5 w-5 text-gray-400" /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-tight">WAVE SNIPER</h2>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Intelligence v2.0</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsSoundEnabled(!isSoundEnabled)}>
                                {isSoundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400" onClick={exitToSelection}>
                                <Power className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Lucro - Foco Total */}
                    <div className="text-center py-2">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em] mb-1">Resultado</p>
                        <div className={cn(
                            "text-6xl font-black tracking-tighter",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-2xl opacity-30 mr-1">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Botão de Ação - Elegante */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-16 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-md",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600" 
                                : "bg-primary hover:bg-primary/90"
                        )}
                    >
                        {isBotRunning ? "Parar Operação" : "Iniciar Sniper"}
                    </Button>

                    {/* Saldo - Minimalista */}
                    <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                            <div className={cn("p-2 rounded-lg", accountType === 'real' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Saldo {accountType === 'real' ? 'Real' : 'Demo'}</p>
                                <p className="text-lg font-black">${accountBalance?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Pensamento da IA - Slim */}
            {isBotRunning && (
                <div className="bg-slate-900 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    <p className="text-[11px] font-mono text-blue-50/80 truncate">
                        {aiThought}
                    </p>
                </div>
            )}

            {/* Histórico - Clean Table */}
            <div className="bg-white/40 backdrop-blur-sm border border-white/40 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Últimos Sinais</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetOperations}>
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </div>
                <ScrollArea className="h-40">
                    <div className="space-y-2">
                        {signals.length > 0 ? signals.map((s: any) => {
                            const label = getSignalLabel(s.signal, s.strategy);
                            const hasFinished = typeof s.profit === 'number';
                            
                            return (
                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-mono text-muted-foreground/50">{s.timestamp}</span>
                                        <span className={cn("text-[10px] font-black uppercase", label.color)}>
                                            {label.text}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "text-[11px] font-black", 
                                        !hasFinished ? "text-blue-400 animate-pulse" : (s.result === 'WIN' ? "text-green-600" : "text-red-500")
                                    )}>
                                        {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-10 text-center text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Aguardando...</div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};