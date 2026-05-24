"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Zap, Volume2, VolumeX, Globe, Cpu, DollarSign, FileSpreadsheet, Percent, ShieldAlert, RotateCcw, MessageSquare } from 'lucide-react';
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
                baseColor = isVirtual ? 'bg-blue-100/50 text-blue-600 border-blue-200/50' : 'bg-green-100/50 text-green-600 border-green-200/50';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'bg-blue-100/50 text-blue-600 border-blue-200/50' : 'bg-red-100/50 text-red-600 border-red-200/50';
                break;
            default: 
                text = signal; 
                baseColor = 'bg-gray-100/50 text-gray-600 border-gray-200/50';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
            
            {/* Status de Sincronização Neural */}
            {isBotRunning && (
                <div className={cn(
                    "rounded-2xl p-3 sm:p-4 flex items-center justify-between border-2 transition-all duration-500",
                    isStudying 
                        ? "bg-blue-500/5 border-blue-500/20 animate-pulse" 
                        : "bg-green-500/5 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Cpu className={cn("h-6 w-6", isStudying ? "text-blue-500" : "text-green-500 animate-[spin_3s_linear_infinite]")} />
                        </div>
                        <div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", isStudying ? "text-blue-600" : "text-green-600")}>
                                {isStudying ? "Sincronizando Fluxo" : "Núcleo de I.A Ativo"}
                            </p>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80 italic">
                                {isStudying ? `Mapeando Padrões... (${studyTicksCount}/5)` : `Operando em Conta ${accountType.toUpperCase()}`}
                            </p>
                        </div>
                    </div>
                    {!isStudying && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-green-600 font-black text-xs">
                                <Percent className="h-3 w-3" />
                                <span>{currentConfidence}% Confiança</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Monitor de Perda Virtual */}
            {isBotRunning && virtualTargetLosses > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">Monitor de Perda Virtual</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {[...Array(virtualTargetLosses)].map((_, i) => (
                                <div key={i} className={cn(
                                    "h-2 w-4 rounded-full transition-all duration-500",
                                    i < virtualLossStreak ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-gray-200"
                                )} />
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-orange-700 ml-2">{virtualLossStreak}/{virtualTargetLosses}</span>
                    </div>
                </div>
            )}

            <Card className="glass-panel border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] relative group">
                
                <BackgroundMarketChart />

                {isBotRunning && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-[scan_3s_linear_infinite] z-20 pointer-events-none" />
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.07] scale-150">
                            <div className="relative">
                                <div className="absolute inset-0 border-[3px] border-blue-500/40 rounded-full scale-[1.1] animate-[spin_8s_linear_infinite]" />
                                <Globe className="h-48 w-48 sm:h-64 sm:w-64 text-blue-600 animate-[spin_15s_linear_infinite]" />
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />
                            </div>
                        </div>
                    </>
                )}

                <CardContent className="p-8 sm:p-12 space-y-8 sm:space-y-10 relative z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/40 backdrop-blur-md rounded-2xl p-1 shadow-inner border border-white/50 overflow-hidden">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50/20"><Bot className="h-6 w-6 text-primary" /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                                    NÚCLEO I.A
                                    <Zap className="h-5 w-5 text-blue-500 fill-current animate-pulse" />
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">WAVE SNIPER v2.0</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl" onClick={() => setIsSoundEnabled(!isSoundEnabled)}>
                                {isSoundEnabled ? <Volume2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <VolumeX className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl hover:text-blue-500" onClick={resetOperations}>
                                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl">
                                    <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl hover:text-red-500" onClick={exitToSelection}>
                                <Power className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Button 
                            onClick={handleStartClick}
                            disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                            className={cn(
                                "w-full h-20 sm:h-24 rounded-[2rem] sm:rounded-[2.5rem] text-xl sm:text-2xl font-black uppercase tracking-[0.3em] transition-all duration-700 shadow-2xl relative z-10",
                                isBotRunning 
                                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/40" 
                                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/40 animate-pulse-bright"
                            )}
                        >
                            {isBotRunning ? "PARAR ROBÔ" : "INICIAR I.A"}
                        </Button>
                        {!isBotRunning && <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-[3rem] animate-pulse -z-10" />}
                    </div>

                    <div className="text-center space-y-2 relative py-4">
                        <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/40 mb-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-80">LUCRO_TOTAL_AO_VIVO</p>
                        </div>
                        <div className={cn(
                            "text-6xl sm:text-8xl font-black tracking-tighter leading-none transition-all duration-500",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-4xl sm:text-5xl opacity-40 mr-1">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 sm:p-8 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 sm:p-4 rounded-2xl transition-colors duration-500",
                                accountType === 'real' ? "bg-green-500/10" : "bg-primary/5"
                            )}>
                                <DollarSign className={cn(
                                    "h-6 w-6 sm:h-7 sm:w-7",
                                    accountType === 'real' ? "text-green-600" : "text-primary"
                                )} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Saldo em Conta</p>
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter",
                                        accountType === 'real' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                                    )}>
                                        {accountType === 'real' ? 'REAL' : 'DEMO'}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl sm:text-3xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'}</p>
                                    <span className="text-[10px] font-black text-primary uppercase">USD</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-6 w-6" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-[2rem] p-4 overflow-hidden shadow-sm">
                <ScrollArea className="h-44 sm:h-52 px-2">
                    <table className="w-full text-[9px] sm:text-[10px] font-bold">
                        <tbody className="divide-y divide-white/10">
                            {signals.length > 0 ? signals.map((s: any) => {
                                const label = getSignalLabel(s.signal, s.strategy);
                                const hasFinished = typeof s.profit === 'number';
                                
                                return (
                                    <tr key={s.id} className="group/row hover:bg-white/10 transition-colors">
                                        <td className="py-3 font-mono opacity-40 text-[8px]">{s.timestamp}</td>
                                        <td className="py-3">
                                            <span className={cn("px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase border", label.color)}>
                                                {label.text}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center text-muted-foreground opacity-60 uppercase text-[8px] tracking-tight">{s.details}</td>
                                        <td className={cn(
                                            "py-3 text-right font-black text-xs", 
                                            !hasFinished ? "text-blue-500 animate-pulse" : (s.result === 'WIN' ? "text-green-600" : "text-red-500")
                                        )}>
                                            {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'ANALISANDO...'}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.4em] italic">Sincronizando Terminal...</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>

            {/* Pensamento da I.A. - Terminal Neural (Movido para baixo) */}
            <div className="bg-black/90 border border-blue-500/30 rounded-2xl p-3 sm:p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)] relative overflow-hidden">
                <div className="absolute inset-0 ai-scanline opacity-10" />
                <div className="flex items-start gap-3 relative z-10">
                    <div className="bg-blue-500/20 p-2 rounded-xl">
                        <MessageSquare className="h-4 w-4 text-blue-400 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Neural_Thought_Stream</p>
                        <p className="text-xs sm:text-sm font-mono text-blue-100 leading-tight">
                            <span className="text-blue-500 mr-2">{'>'}</span>
                            {aiThought}
                            <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse" />
                        </p>
                    </div>
                </div>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};