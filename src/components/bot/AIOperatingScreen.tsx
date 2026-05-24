"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Zap, Volume2, VolumeX, Globe, Cpu, DollarSign, FileSpreadsheet, Percent, ShieldAlert, RotateCcw, MessageSquare, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickConfigModal } from './QuickConfigModal';
import { SettingsSheet } from './SettingsSheet';
import { BackgroundMarketChart } from './BackgroundMarketChart';

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
        virtualLossStreak, virtualTargetLosses,
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
                baseColor = isVirtual ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-green-100 text-green-600 border-green-200';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-red-100 text-red-600 border-red-200';
                break;
            default: 
                text = signal; 
                baseColor = 'bg-gray-100 text-gray-600 border-gray-200';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-700 px-2 sm:px-0 pb-10">
            
            {/* Status & Pensamento (HUD Superior) */}
            <div className="space-y-3">
                {isBotRunning && (
                    <div className={cn(
                        "rounded-2xl p-4 flex items-center justify-between border transition-all duration-500",
                        isStudying 
                            ? "bg-blue-50 border-blue-100" 
                            : "bg-green-50 border-green-100"
                    )}>
                        <div className="flex items-center gap-3">
                            <Cpu className={cn("h-5 w-5", isStudying ? "text-blue-500 animate-pulse" : "text-green-500 animate-spin-slow")} />
                            <div>
                                <p className={cn("text-[10px] font-black uppercase tracking-widest", isStudying ? "text-blue-600" : "text-green-600")}>
                                    {isStudying ? "Sincronizando" : "Sistema Ativo"}
                                </p>
                                <p className="text-xs font-bold text-muted-foreground">
                                    {isStudying ? `Mapeando... (${studyTicksCount}/5)` : `Conta ${accountType.toUpperCase()}`}
                                </p>
                            </div>
                        </div>
                        {!isStudying && (
                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-green-100 shadow-sm">
                                <Activity className="h-3 w-3 text-green-500" />
                                <span className="text-[10px] font-black text-green-600">{currentConfidence}%</span>
                            </div>
                        )}
                    </div>
                )}

                {isBotRunning && (
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                        <div className="absolute inset-0 ai-scanline opacity-5" />
                        <div className="flex items-start gap-3 relative z-10">
                            <MessageSquare className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Neural_Stream</p>
                                <p className="text-xs sm:text-sm font-mono text-blue-50 leading-relaxed">
                                    {aiThought}
                                    <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Painel Principal */}
            <Card className="glass-panel border-none shadow-2xl overflow-hidden rounded-[2.5rem] relative">
                
                <BackgroundMarketChart />

                <CardContent className="p-8 sm:p-10 space-y-8 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-hidden">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50"><Bot className="h-6 w-6 text-primary" /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter italic">NÚCLEO I.A</h2>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">WAVE SNIPER v2.0</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setIsSoundEnabled(!isSoundEnabled)}>
                                {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={resetOperations}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                    <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600" onClick={exitToSelection}>
                                <Power className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Lucro */}
                    <div className="text-center space-y-1 py-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Resultado da Sessão</p>
                        <div className={cn(
                            "text-7xl font-black tracking-tighter leading-none",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-3xl opacity-40 mr-1">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Botão de Ação */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-xl",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                                : "bg-primary hover:bg-primary/90 shadow-primary/20 animate-pulse-bright"
                        )}
                    >
                        {isBotRunning ? "PARAR ROBÔ" : "INICIAR I.A"}
                    </Button>

                    {/* Saldo */}
                    <div className="bg-white/50 border border-white/80 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-xl",
                                accountType === 'real' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                            )}>
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Saldo em Conta</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'}</p>
                                    <span className="text-[10px] font-black text-primary uppercase">{accountType === 'real' ? 'REAL' : 'DEMO'}</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Histórico */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Histórico de Sinais</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <ScrollArea className="h-48 px-1">
                    <table className="w-full text-[10px] font-bold">
                        <tbody className="divide-y divide-gray-50">
                            {signals.length > 0 ? signals.map((s: any) => {
                                const label = getSignalLabel(s.signal, s.strategy);
                                const hasFinished = typeof s.profit === 'number';
                                
                                return (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 font-mono text-muted-foreground/60 text-[9px]">{s.timestamp}</td>
                                        <td className="py-3">
                                            <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase border", label.color)}>
                                                {label.text}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center text-muted-foreground uppercase text-[8px]">{s.details}</td>
                                        <td className={cn(
                                            "py-3 text-right font-black text-xs", 
                                            !hasFinished ? "text-blue-500 animate-pulse" : (s.result === 'WIN' ? "text-green-600" : "text-red-500")
                                        )}>
                                            {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest italic">Aguardando Sinais...</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};