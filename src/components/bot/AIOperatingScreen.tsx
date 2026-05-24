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
                baseColor = isVirtual ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                break;
            default: 
                text = signal; 
                baseColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-2 sm:px-0 pb-10">
            
            {/* HUD Superior: Status & Pensamento */}
            <div className="space-y-3">
                {isBotRunning && (
                    <div className={cn(
                        "rounded-3xl p-4 flex items-center justify-between border backdrop-blur-xl transition-all duration-700",
                        isStudying 
                            ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]" 
                            : "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                    )}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className={cn("absolute -inset-2 rounded-full blur-md opacity-40", isStudying ? "bg-blue-500" : "bg-emerald-500")} />
                                <Cpu className={cn("h-6 w-6 relative z-10", isStudying ? "text-blue-400 animate-pulse" : "text-emerald-400 animate-[spin_4s_linear_infinite]")} />
                            </div>
                            <div>
                                <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isStudying ? "text-blue-400" : "text-emerald-400")}>
                                    {isStudying ? "Sincronizando Fluxo" : "Núcleo de I.A Ativo"}
                                </p>
                                <p className="text-[11px] font-bold text-white/60 italic">
                                    {isStudying ? `Mapeando Padrões... (${studyTicksCount}/5)` : `Operando em Conta ${accountType.toUpperCase()}`}
                                </p>
                            </div>
                        </div>
                        {!isStudying && (
                            <div className="bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[10px]">
                                    <Activity className="h-3 w-3" />
                                    <span>{currentConfidence}% CONFIDANÇA</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isBotRunning && (
                    <div className="bg-slate-950/80 border border-blue-500/30 rounded-3xl p-4 shadow-[0_0_25px_rgba(59,130,246,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 ai-scanline opacity-20" />
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="bg-blue-500/20 p-2.5 rounded-2xl border border-blue-500/30">
                                <MessageSquare className="h-4 w-4 text-blue-400 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1.5">
                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em]">Neural_Thought_Stream</p>
                                    <div className="flex gap-1">
                                        <div className="h-1 w-1 rounded-full bg-blue-500/50 animate-ping" />
                                        <div className="h-1 w-1 rounded-full bg-blue-500/50 animate-ping [animation-delay:0.2s]" />
                                    </div>
                                </div>
                                <p className="text-xs sm:text-sm font-mono text-blue-50/90 leading-relaxed">
                                    <span className="text-blue-500 font-bold mr-2">λ</span>
                                    {aiThought}
                                    <span className="inline-block w-2 h-4 bg-blue-500/60 ml-1 animate-pulse align-middle" />
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Monitor de Perda Virtual - Estilo HUD */}
            {isBotRunning && virtualTargetLosses > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-4 flex items-center justify-between backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500/20 p-2 rounded-xl">
                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/70">Filtro de Perda Virtual</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            {[...Array(virtualTargetLosses)].map((_, i) => (
                                <div key={i} className={cn(
                                    "h-1.5 w-6 rounded-full transition-all duration-700",
                                    i < virtualLossStreak 
                                        ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]" 
                                        : "bg-white/10"
                                )} />
                            ))}
                        </div>
                        <span className="text-[11px] font-black text-amber-500 font-mono">{virtualLossStreak}/{virtualTargetLosses}</span>
                    </div>
                </div>
            )}

            {/* Painel Principal */}
            <Card className="bg-slate-900/40 border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden rounded-[3rem] relative group backdrop-blur-2xl">
                
                <BackgroundMarketChart />

                {/* Efeitos de Fundo Dinâmicos */}
                {isBotRunning && (
                    <>
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[scan_4s_linear_infinite] z-20" />
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.05] scale-150">
                            <div className="relative">
                                <div className="absolute inset-0 border-[2px] border-blue-500/30 rounded-full scale-[1.2] animate-[spin_12s_linear_infinite]" />
                                <Globe className="h-64 w-64 text-blue-400 animate-[spin_25s_linear_infinite]" />
                                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-[100px] animate-pulse" />
                            </div>
                        </div>
                    </>
                )}

                <CardContent className="p-8 sm:p-10 space-y-8 relative z-10">
                    {/* Header do Painel */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="relative group/avatar">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-emerald-600 rounded-2xl blur opacity-20 group-hover/avatar:opacity-40 transition-opacity" />
                                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-slate-950/50 backdrop-blur-xl rounded-2xl p-1 shadow-2xl border border-white/10 overflow-hidden relative z-10">
                                    {selectedAIInfo?.image ? (
                                        <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-xl grayscale-[0.3] group-hover/avatar:grayscale-0 transition-all" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Bot className="h-7 w-7 text-blue-400" /></div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2 text-white">
                                    NÚCLEO I.A
                                    <Zap className="h-5 w-5 text-blue-400 fill-current animate-pulse" />
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/80">WAVE SNIPER v2.0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5" onClick={() => setIsSoundEnabled(!isSoundEnabled)}>
                                {isSoundEnabled ? <Volume2 className="h-5 w-5 text-blue-400" /> : <VolumeX className="h-5 w-5 text-slate-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/30 transition-all" onClick={resetOperations}>
                                <RotateCcw className="h-5 w-5 text-white/70" />
                            </Button>
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5">
                                    <FileSpreadsheet className="h-5 w-5 text-white/70" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-all" onClick={exitToSelection}>
                                <Power className="h-5 w-5 text-rose-500" />
                            </Button>
                        </div>
                    </div>

                    {/* Botão de Ação Principal */}
                    <div className="relative">
                        <Button 
                            onClick={handleStartClick}
                            disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                            className={cn(
                                "w-full h-20 sm:h-24 rounded-[2.5rem] text-xl sm:text-2xl font-black uppercase tracking-[0.4em] transition-all duration-700 shadow-2xl relative z-10 border-t border-white/10",
                                isBotRunning 
                                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 text-white" 
                                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 text-white animate-pulse-bright"
                            )}
                        >
                            {isBotRunning ? "PARAR ROBÔ" : "INICIAR I.A"}
                        </Button>
                        {!isBotRunning && <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-[3rem] animate-pulse -z-10" />}
                    </div>

                    {/* Display de Lucro Ultra-Moderno */}
                    <div className="text-center space-y-3 relative py-6">
                        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/10">
                            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isWin ? "bg-emerald-500" : "bg-rose-500")} />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">LUCRO_TOTAL_AO_VIVO</p>
                        </div>
                        <div className={cn(
                            "text-7xl sm:text-8xl font-black tracking-tighter leading-none transition-all duration-700 drop-shadow-[0_0_30px_rgba(0,0,0,0.3)]",
                            isWin ? "text-emerald-400" : "text-rose-400"
                        )}>
                            <span className="text-3xl sm:text-4xl opacity-30 mr-2 font-light">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Seção de Saldo Estilo Fintech */}
                    <div className="bg-slate-950/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 flex items-center justify-between shadow-inner group/balance">
                        <div className="flex items-center gap-5">
                            <div className={cn(
                                "p-4 rounded-2xl transition-all duration-700 border",
                                accountType === 'real' 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            )}>
                                <DollarSign className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 mb-1">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Saldo Disponível</p>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border",
                                        accountType === 'real' 
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    )}>
                                        {accountType === 'real' ? 'REAL' : 'DEMO'}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">{accountBalance?.toFixed(2) || '0.00'}</p>
                                    <span className="text-xs font-black text-blue-400/60 uppercase">USD</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 group-hover/balance:rotate-180 transition-transform duration-700" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-6 w-6 text-white/50" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Terminal de Histórico */}
            <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-5 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Log de Operações</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/20 font-mono">v2.0.4_STABLE</span>
                </div>
                <ScrollArea className="h-48 sm:h-56 px-2">
                    <table className="w-full text-[10px] font-bold">
                        <tbody className="divide-y divide-white/5">
                            {signals.length > 0 ? signals.map((s: any) => {
                                const label = getSignalLabel(s.signal, s.strategy);
                                const hasFinished = typeof s.profit === 'number';
                                
                                return (
                                    <tr key={s.id} className="group/row hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-mono text-white/20 text-[9px]">{s.timestamp}</td>
                                        <td className="py-4">
                                            <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase border backdrop-blur-md", label.color)}>
                                                {label.text}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center text-white/40 uppercase text-[9px] tracking-tight font-medium">{s.details}</td>
                                        <td className={cn(
                                            "py-4 text-right font-black text-sm", 
                                            !hasFinished ? "text-blue-400 animate-pulse" : (s.result === 'WIN' ? "text-emerald-400" : "text-rose-400")
                                        )}>
                                            {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'PROCESSANDO...'}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.5em] italic">Aguardando Sinais Neurais...</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};