"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Activity, DollarSign, FileSpreadsheet, RotateCcw, MessageSquare, TrendingUp, TrendingDown, Target, BrainCircuit, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickConfigModal } from './QuickConfigModal';
import { SettingsSheet } from './SettingsSheet';
import { RecentDigitsPanel } from './RecentDigitsPanel';
import confetti from 'canvas-confetti';

export const AIOperatingScreen = () => {
    const { 
        selectedAIInfo, totalProfit, accountBalance, 
        isBotRunning, toggleBot, resetOperations, exitToSelection, 
        status, signals,
        handleConnect, accountType, realToken, demoToken,
        isPaused, isManipulationDetected,
        isStudying,
        currentConfidence,
        aiThought,
        takeProfit,
        isConfigModalOpen, setIsConfigModalOpen,
        manualBuy,
        tradeStatus,
        isConnected,
        lastDigits
    } = useBotContext();

    const hasTriggeredGoalConfettiRef = useRef(false);

    // Resetar o gatilho de confete quando o lucro for zerado (ao reiniciar as operações)
    useEffect(() => {
        if (totalProfit === 0) {
            hasTriggeredGoalConfettiRef.current = false;
        }
    }, [totalProfit]);

    // Efeito de confete premium ao atingir a meta (Take Profit)
    useEffect(() => {
        const targetProfit = parseFloat(takeProfit) || 0;
        if (targetProfit > 0 && totalProfit >= targetProfit && !hasTriggeredGoalConfettiRef.current) {
            hasTriggeredGoalConfettiRef.current = true;
            
            // Celebração Premium de Meta Batida (Várias explosões consecutivas)
            const duration = 4 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                // Explosão da esquerda
                confetti({
                    particleCount: 6,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: ['#22d3ee', '#34d399', '#818cf8', '#fbbf24']
                });
                // Explosão da direita
                confetti({
                    particleCount: 6,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: ['#22d3ee', '#34d399', '#818cf8', '#fbbf24']
                });
                // Explosão central aleatória
                if (Math.random() > 0.7) {
                    confetti({
                        particleCount: 15,
                        angle: 90,
                        spread: 80,
                        origin: { x: Math.random() * 0.4 + 0.3, y: 0.6 },
                        colors: ['#a78bfa', '#f472b6', '#34d399']
                    });
                }

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [totalProfit, takeProfit]);

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
                baseColor = isVirtual ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                baseColor = isVirtual ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                break;
            case 'CALL': 
                text = 'SOBE'; 
                baseColor = isVirtual ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                break;
            case 'PUT': 
                text = 'DESCE'; 
                baseColor = isVirtual ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                break;
            default: 
                text = signal; 
                baseColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, color: baseColor };
    };

    const isTradePending = tradeStatus === 'SENDING' || tradeStatus === 'ACTIVE';

    // Inteligência de Sinal em Tempo Real para Entrada Manual
    const manualSignalIntelligence = useMemo(() => {
        const digits = lastDigits || [];
        if (digits.length < 10) {
            return { recommendation: 'AGUARDAR', confidence: 0, evenPercent: 50, oddPercent: 50, reason: 'Sincronizando dados...' };
        }

        const sample = digits.slice(0, 25);
        const evens = sample.filter(d => d % 2 === 0).length;
        const odds = sample.length - evens;
        const evenPercent = Math.round((evens / sample.length) * 100);
        const oddPercent = 100 - evenPercent;

        // Calcular sequência consecutiva atual
        let currentStreak = 1;
        const firstIsEven = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstIsEven) {
                currentStreak++;
            } else {
                break;
            }
        }

        let recommendation = 'AGUARDAR';
        let confidence = 0;
        let reason = 'Mercado equilibrado. Aguarde distorção.';

        // Lógica de Reversão de Sequência (Gatilho Forte)
        if (currentStreak >= 4) {
            recommendation = firstIsEven ? 'ÍMPAR' : 'PAR';
            confidence = Math.min(98, 75 + (currentStreak * 5));
            reason = `Sequência de ${currentStreak}x ${firstIsEven ? 'PAR' : 'ÍMPAR'} detectada. Alta probabilidade de reversão!`;
        } 
        // Lógica de Desequilíbrio de Porcentagem (Gatilho Moderado)
        else if (evenPercent >= 64) {
            recommendation = 'ÍMPAR';
            confidence = Math.min(95, evenPercent + 10);
            reason = `Distorção estatística: ${evenPercent}% de PAR nos últimos 25 ticks.`;
        } else if (oddPercent >= 64) {
            recommendation = 'PAR';
            confidence = Math.min(95, oddPercent + 10);
            reason = `Distorção estatística: ${oddPercent}% de ÍMPAR nos últimos 25 ticks.`;
        }

        return { recommendation, confidence, evenPercent, oddPercent, reason };
    }, [lastDigits]);

    return (
        <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-1 pb-6">
            
            {/* Status Bar Superior */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 bg-slate-950/60 backdrop-blur-xl p-1 pr-3 rounded-full border border-white/10">
                    <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-500",
                        isBotRunning ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800/50 text-slate-500"
                    )}>
                        <Activity className={cn("h-3 w-3", isBotRunning && "animate-pulse")} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-tighter leading-none text-slate-400">
                            Status
                        </span>
                        <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest leading-none mt-0.5",
                            isBotRunning ? "text-emerald-400" : "text-slate-500"
                        )}>
                            {isBotRunning ? (isStudying ? "Sincronizando..." : "Sniper Online") : "Offline"}
                        </span>
                    </div>
                </div>

                {isBotRunning && !isStudying && (
                    <div className="flex items-center gap-1.5 bg-cyan-500/10 backdrop-blur-xl px-3 py-1 rounded-full border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                        <Target className="h-3 w-3 text-cyan-400 animate-pulse" />
                        <span className="text-[9px] font-black text-cyan-400 tracking-wider">{currentConfidence}% Precisão</span>
                    </div>
                )}
            </div>

            {/* Painel Premium de 8 Dígitos Recentes */}
            <RecentDigitsPanel />

            {/* Painel Central - Estética "Cyber-Luxury" */}
            <Card className="relative overflow-hidden bg-slate-950/60 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] rounded-[2rem] transition-all duration-500 hover:border-cyan-500/20">
                {/* Efeitos de Fundo Decorativos */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] -mr-24 -mt-24" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] -ml-24 -mb-24" />
                
                <CardContent className="p-4 sm:p-6 space-y-6 relative z-10">
                    {/* Header com Branding */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl blur opacity-25" />
                                <div className="h-12 w-12 bg-slate-900 rounded-xl p-0.5 shadow-2xl border border-white/10 overflow-hidden">
                                    {selectedAIInfo?.image ? (
                                        <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800"><Bot className="h-5 w-5 text-cyan-400" /></div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <h2 className="text-base font-black text-white italic tracking-tighter">WAVE SNIPER</h2>
                                    <div className="px-1 py-0.5 bg-cyan-500/20 rounded border border-cyan-500/30">
                                        <span className="text-[7px] font-black text-cyan-400 uppercase">PRO</span>
                                    </div>
                                </div>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">Neural Engine v2.4.0</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-300" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all" onClick={exitToSelection}>
                                <Power className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Display de Lucro Hero */}
                    <div className="flex flex-col items-center py-2 relative">
                        <div className={cn(
                            "absolute inset-0 blur-[80px] opacity-20 -z-10 transition-all duration-1000",
                            isWin ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        
                        <div className="flex items-center gap-1.5 mb-1">
                            {isWin ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Resultado da Sessão</span>
                        </div>
                        
                        <div className={cn(
                            "text-5xl sm:text-6xl font-black tracking-tighter leading-none transition-all duration-700 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]",
                            isWin ? "text-emerald-400" : "text-rose-400"
                        )}>
                            <span className="text-2xl opacity-40 mr-0.5 font-medium font-sans">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Botão de Ignição */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "group relative w-full h-16 rounded-2xl overflow-hidden transition-all duration-500 shadow-2xl active:scale-95",
                            isBotRunning 
                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20" 
                                : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-cyan-500/20"
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <span className="relative flex items-center gap-2 text-base font-black uppercase tracking-[0.2em]">
                            {isBotRunning ? (
                                <>PARAR<Power className="h-4 w-4" /></>
                            ) : (
                                <>INICIAR<BrainCircuit className="h-4 w-4" /></>
                            )}
                        </span>
                    </Button>

                    {/* Seção de Entradas Manuais com Inteligência de Sinal */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-cyan-400" /> Sinal de Entrada Manual
                            </span>
                            {isTradePending && (
                                <span className="text-[8px] font-bold text-cyan-400 animate-pulse uppercase">Operação em andamento...</span>
                            )}
                        </div>

                        {/* Display de Inteligência de Sinal */}
                        <div className={cn(
                            "p-3 rounded-xl border transition-all duration-500 flex flex-col gap-2",
                            manualSignalIntelligence.recommendation === 'PAR' 
                                ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                                : manualSignalIntelligence.recommendation === 'ÍMPAR'
                                    ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                                    : "bg-slate-900/40 border-white/5"
                        )}>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recomendação I.A</span>
                                {manualSignalIntelligence.confidence > 0 && (
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded-full",
                                        manualSignalIntelligence.recommendation === 'PAR' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                    )}>
                                        {manualSignalIntelligence.confidence}% Confiança
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-2xl font-black tracking-tight",
                                    manualSignalIntelligence.recommendation === 'PAR' ? "text-emerald-400" : manualSignalIntelligence.recommendation === 'ÍMPAR' ? "text-rose-400" : "text-slate-400"
                                )}>
                                    {manualSignalIntelligence.recommendation}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                    {manualSignalIntelligence.reason}
                                </span>
                            </div>

                            {/* Barra de Força Estatística */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold text-slate-500">
                                    <span>PAR: {manualSignalIntelligence.evenPercent}%</span>
                                    <span>ÍMPAR: {manualSignalIntelligence.oddPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${manualSignalIntelligence.evenPercent}%` }} />
                                    <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${manualSignalIntelligence.oddPercent}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Botões de Entrada Manual */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => manualBuy('DIGITEVEN', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-12 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                                PAR
                            </Button>
                            <Button
                                onClick={() => manualBuy('DIGITODD', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-12 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95"
                            >
                                <ArrowDownRight className="h-4 w-4" />
                                ÍMPAR
                            </Button>
                        </div>
                    </div>

                    {/* Wallet / Balance Section */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between group hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shadow-inner transition-colors duration-500",
                                accountType === 'real' ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
                            )}>
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                                    Saldo
                                </p>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400">$</span>
                                    <p className="text-xl font-black text-white tracking-tighter leading-none">
                                        {accountBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 hover:rotate-180 transition-all duration-500" 
                            onClick={() => handleConnect(accountType, currentToken)}
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* AI Thought Stream */}
            {isBotRunning && (
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur opacity-10" />
                    <div className="relative bg-slate-950/60 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3 border border-white/10 shadow-2xl">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare className="h-3 w-3 text-cyan-400" />
                                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Fluxo_Cognitivo</span>
                            </div>
                            <p className="text-xs font-medium text-slate-200 leading-relaxed italic">
                                "{aiThought}"
                                <span className="inline-block w-1 h-2.5 bg-cyan-400 ml-1 animate-pulse" />
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Monitor de Sinais - Versão Dark Integrada */}
            <div className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feed de Operações</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5" onClick={resetOperations}>
                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                </div>
                
                <ScrollArea className="h-44 pr-2">
                    <div className="space-y-2">
                        {signals.length > 0 ? signals.map((s: any) => {
                            const label = getSignalLabel(s.signal, s.strategy);
                            const hasFinished = typeof s.profit === 'number';
                            
                            return (
                                <div key={s.id} className="group relative flex items-center justify-between p-2.5 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-white/5 transition-all duration-300">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[9px] font-mono text-slate-500">{s.timestamp}</span>
                                        <div className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase border transition-all duration-300", label.color)}>
                                            {label.text}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-black tracking-tighter", 
                                        !hasFinished ? "text-cyan-400 animate-pulse" : (s.result === 'WIN' ? "text-emerald-400" : "text-rose-400")
                                    )}>
                                        {hasFinished ? (
                                            <span className="flex items-center gap-0.5">
                                                {s.profit > 0 ? '+' : ''}{s.profit.toFixed(2)}
                                                {s.result === 'WIN' ? '⚡' : '💀'}
                                            </span>
                                        ) : 'ANALISANDO...'}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center">
                                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/5 mb-2 border border-white/5">
                                    <Target className="h-4 w-4 text-slate-500" />
                                </div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Aguardando gatilhos neurais...</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};