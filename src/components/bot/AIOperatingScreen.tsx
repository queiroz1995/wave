"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Activity, DollarSign, FileSpreadsheet, RotateCcw, MessageSquare, TrendingUp, TrendingDown, Target, BrainCircuit, ArrowUpRight, ArrowDownRight, Award, BarChart3, Volume2, VolumeX, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickConfigModal } from './QuickConfigModal';
import { SettingsSheet } from './SettingsSheet';
import { RecentDigitsPanel } from './RecentDigitsPanel';
import { DiagnosticsModal } from './DiagnosticsModal';
import { VirtualLossDisplay } from './VirtualLossDisplay';
import { Progress } from '@/components/ui/progress';
import { sounds } from '@/utils/sounds';
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
        stopLoss,
        isConfigModalOpen, setIsConfigModalOpen,
        manualBuy,
        tradeStatus,
        isConnected
    } = useBotContext();

    const hasTriggeredGoalConfettiRef = useRef(false);
    const [profitHistory, setProfitHistory] = useState<number[]>([0]);
    const [isMuted, setIsMuted] = useState(sounds.isMuted());

    // Atualiza o histórico de lucro para desenhar o gráfico de curva de patrimônio (Equity Curve)
    useEffect(() => {
        setProfitHistory(prev => {
            const last = prev[prev.length - 1];
            if (last !== totalProfit) {
                const next = [...prev, totalProfit];
                return next.slice(-15);
            }
            return prev;
        });
    }, [totalProfit]);

    // Toca som de vitória leve quando houver um WIN
    useEffect(() => {
        if (signals.length > 0) {
            const mostRecentSignal = signals[0];
            if (mostRecentSignal.result === 'WIN') {
                sounds.playSuccess();
            }
        }
    }, [signals]);

    // Resetar o gatilho de confete quando o lucro for zerado (ao reiniciar as operações)
    useEffect(() => {
        if (totalProfit === 0) {
            hasTriggeredGoalConfettiRef.current = false;
            setProfitHistory([0]);
        }
    }, [totalProfit]);

    // Efeito de confete premium ao atingir a meta (Take Profit)
    useEffect(() => {
        const targetProfit = parseFloat(takeProfit) || 0;
        if (targetProfit > 0 && totalProfit >= targetProfit && !hasTriggeredGoalConfettiRef.current) {
            hasTriggeredGoalConfettiRef.current = true;
            sounds.playSuccess();
            
            const duration = 4 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 6,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: ['#22d3ee', '#34d399', '#818cf8', '#fbbf24']
                });
                confetti({
                    particleCount: 6,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: ['#22d3ee', '#34d399', '#818cf8', '#fbbf24']
                });
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

    const toggleMute = () => {
        const nextMute = !isMuted;
        sounds.setMuted(nextMute);
        setIsMuted(nextMute);
    };

    const getSignalLabel = (signal: string, strategy: string) => {
        const isVirtual = strategy.includes('VIRTUAL');
        let dotColor = '';
        let text = '';

        switch (signal) {
            case 'EVEN': 
                text = 'PAR'; 
                dotColor = isVirtual ? 'bg-cyan-400' : 'bg-emerald-400';
                break;
            case 'ODD': 
                text = 'ÍMPAR'; 
                dotColor = isVirtual ? 'bg-cyan-400' : 'bg-rose-400';
                break;
            default: 
                text = signal; 
                dotColor = 'bg-slate-400';
        }

        return { text: isVirtual ? `VIRTUAL: ${text}` : text, dotColor, isVirtual };
    };

    const isTradePending = tradeStatus === 'SENDING' || tradeStatus === 'ACTIVE';

    // Cálculos para a barra de progresso da meta diária
    const targetProfitValue = parseFloat(takeProfit) || 10;
    const goalProgressPercentage = Math.min(100, Math.max(0, (totalProfit / targetProfitValue) * 100));

    return (
        <div className="w-full max-w-md mx-auto space-y-3 animate-in fade-in duration-500 px-1 pb-4">
            
            {/* Painel Premium de 8 Dígitos Recentes */}
            <RecentDigitsPanel />

            {/* Painel de Monitoramento de Loss Virtual */}
            <VirtualLossDisplay />

            {/* Painel Central Unificado - Estética Minimalista e Focada na IA */}
            <Card className="relative overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-[2rem]">
                <CardContent className="p-5 space-y-5 relative z-10">
                    
                    {/* Header do Robô */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 bg-slate-900 rounded-xl p-0.5 border border-white/5 overflow-hidden">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800"><Bot className="h-4 w-4 text-cyan-400" /></div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <h2 className="text-sm font-black text-white tracking-tight">WAVE SNIPER</h2>
                                    <span className="text-[7px] font-black text-cyan-400 bg-cyan-500/10 px-1 rounded border border-cyan-500/20">PRO</span>
                                </div>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Neural Engine Active</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                                onClick={toggleMute}
                            >
                                {isMuted ? (
                                    <VolumeX className="h-3 w-3 text-rose-400" />
                                ) : (
                                    <Volume2 className="h-3 w-3 text-emerald-400" />
                                )}
                            </Button>
                            <DiagnosticsModal />
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-slate-300" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all" onClick={exitToSelection}>
                                <Power className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Display de Lucro Hero */}
                    <div className="flex flex-col items-center py-1 relative">
                        <div className="flex items-center gap-1 mb-1">
                            {isWin ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resultado da Sessão</span>
                        </div>
                        
                        <div className={cn(
                            "text-4xl font-black tracking-tighter leading-none transition-all duration-500",
                            isWin ? "text-emerald-400" : "text-rose-400"
                        )}>
                            <span className="text-xl opacity-40 mr-0.5 font-medium">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Barra de Progresso da Meta Diária Integrada */}
                    {isBotRunning && (
                        <div className="space-y-1 bg-white/[0.01] border border-white/5 p-2.5 rounded-xl">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1"><Award className="h-2.5 w-2.5 text-yellow-400" /> Progresso da Meta</span>
                                <span className="text-cyan-400">{goalProgressPercentage.toFixed(0)}%</span>
                            </div>
                            <Progress 
                                value={goalProgressPercentage} 
                                className="h-1 bg-slate-900 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500"
                            />
                        </div>
                    )}

                    {/* Botão de Ignição */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "group relative w-full h-14 rounded-xl overflow-hidden transition-all duration-500 shadow-lg active:scale-95",
                            isBotRunning 
                                ? "bg-rose-600 hover:bg-rose-700" 
                                : "bg-cyan-500 hover:bg-cyan-600 text-slate-950"
                        )}
                    >
                        <span className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                            {isBotRunning ? (
                                <>PARAR OPERAÇÕES<Power className="h-3.5 w-3.5" /></>
                            ) : (
                                <>INICIAR PILOTO AUTOMÁTICO<BrainCircuit className="h-3.5 w-3.5" /></>
                            )}
                        </span>
                    </Button>

                    {/* Seção de Entradas Manuais */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Entradas Manuais</span>
                            {isTradePending && (
                                <span className="text-[7px] font-bold text-cyan-400 animate-pulse uppercase">Operando...</span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => manualBuy('DIGITEVEN', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-10 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                            >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                PAR
                            </Button>
                            <Button
                                onClick={() => manualBuy('DIGITODD', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-10 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                            >
                                <ArrowDownRight className="h-3.5 w-3.5" />
                                ÍMPAR
                            </Button>
                        </div>
                    </div>

                    {/* Wallet / Balance Section */}
                    <div className="bg-slate-900/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner",
                                accountType === 'real' ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                            )}>
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                                    Saldo
                                </p>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-400">$</span>
                                    <p className="text-base font-black text-white tracking-tight">
                                        {accountBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 hover:rotate-180 transition-all duration-500" 
                            onClick={() => handleConnect(accountType, currentToken)}
                        >
                            <RefreshCw className="h-3 w-3 text-slate-400" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* AI Thought Stream */}
            {isBotRunning && (
                <div className="bg-slate-950/40 backdrop-blur-xl rounded-2xl p-3 flex items-start gap-2.5 border border-white/5">
                    <div className="mt-1 h-1 w-1 rounded-full bg-cyan-400 animate-ping" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3 text-cyan-400" />
                            <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Fluxo_Cognitivo</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                            "{aiThought}"
                            <span className="inline-block w-1 h-2.5 bg-cyan-400 ml-1 animate-pulse" />
                        </p>
                    </div>
                </div>
            )}

            {/* Monitor de Sinais - Versão Avançada e Discreta (Estilo Terminal de Operações) */}
            <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 shadow-2xl">
                <div className="flex items-center justify-between mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-3 w-3 text-cyan-500/70" />
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">NEURAL_CONSOLE_FEED</span>
                        <span className="h-1 w-1 rounded-full bg-cyan-500 animate-pulse" />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-all" 
                        onClick={resetOperations}
                    >
                        <RotateCcw className="h-2.5 w-2.5 text-slate-400" />
                    </Button>
                </div>
                
                <ScrollArea className="h-32 pr-1">
                    <div className="space-y-1 font-mono text-[9px]">
                        {signals.length > 0 ? signals.map((s: any) => {
                            const label = getSignalLabel(s.signal, s.strategy);
                            const hasFinished = typeof s.profit === 'number';
                            
                            return (
                                <div 
                                    key={s.id} 
                                    className={cn(
                                        "flex items-center justify-between py-1 px-2 rounded-lg border transition-all duration-300",
                                        !hasFinished 
                                            ? "bg-cyan-500/5 border-cyan-500/10 text-cyan-400" 
                                            : s.result === 'WIN' 
                                                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                                                : "bg-rose-500/5 border-rose-500/10 text-rose-400"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-slate-500 text-[8px]">{s.timestamp}</span>
                                        <span className={cn("h-1 w-1 rounded-full shrink-0", label.dotColor)} />
                                        <span className="font-bold truncate max-w-[140px]">
                                            {label.text}
                                        </span>
                                        {label.isVirtual && (
                                            <span className="text-[7px] text-cyan-500/60 font-semibold tracking-tighter">VRT</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0 font-bold">
                                        {!hasFinished ? (
                                            <span className="text-cyan-400 animate-pulse flex items-center gap-0.5">
                                                ANALISANDO
                                                <span className="inline-block w-0.5 h-1.5 bg-cyan-400 animate-ping" />
                                            </span>
                                        ) : (
                                            <span className={cn(
                                                "flex items-center gap-0.5",
                                                s.result === 'WIN' ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                {s.profit > 0 ? '+' : ''}{s.profit.toFixed(2)}
                                                <span className="text-[8px] opacity-80">
                                                    {s.result === 'WIN' ? 'WIN' : 'LOSS'}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
                                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                                    [AGUARDANDO_GATILHOS_NEURAIS]
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};