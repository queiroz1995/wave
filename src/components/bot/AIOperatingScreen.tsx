"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Bot, Activity, DollarSign, FileSpreadsheet, RotateCcw, MessageSquare, TrendingUp, TrendingDown, Target, BrainCircuit, ArrowUpRight, ArrowDownRight, Award, BarChart3, Volume2, VolumeX, Terminal, Settings, ShieldAlert, Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickConfigModal } from './QuickConfigModal';
import { SettingsSheet } from './SettingsSheet';
import { RecentDigitsPanel } from './RecentDigitsPanel';
import { DiagnosticsModal } from './DiagnosticsModal';
import { VirtualLossDisplay } from './VirtualLossDisplay';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sounds } from '@/utils/sounds';
import { toast } from "sonner";
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
        isConnected,
        // Sequência Automática
        autoSequenceActive, setAutoSequenceActive,
        autoSequenceTrigger, setAutoSequenceTrigger,
        autoSequenceEntry, setAutoSequenceEntry,
        // Loss Virtual Toggle
        isVirtualLossActive, setIsVirtualLossActive,
        // Estratégias Salvas
        savedCustomStrategies, setSavedCustomStrategies
    } = useBotContext();

    const hasTriggeredGoalConfettiRef = useRef(false);
    const [profitHistory, setProfitHistory] = useState<number[]>([0]);
    const [isMuted, setIsMuted] = useState(sounds.isMuted());
    const [showConsole, setShowConsole] = useState(false); // Estado para ocultar/mostrar painéis avançados

    // Estados locais para edição do padrão personalizado
    const [patternInput, setPatternInput] = useState(autoSequenceTrigger || 'O,O,O');
    const [strategyNameInput, setStrategyNameInput] = useState('');

    // Atualiza o histórico de lucro para desenhar o gráfico de curva de patrimônio (Equity Curve)
    useEffect(() => {
        setProfitHistory(prev => {
            const last = prev[prev.length - 1];
            if (last !== totalProfit) {
                const next = [...prev, totalProfit];
                // Mantém os últimos 15 pontos para o gráfico ficar limpo
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
            
            // Celebração Premium de Meta Batida (Várias explosões consecutivas)
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

    // Desenha a curva de patrimônio (Equity Curve) em SVG
    const renderEquityCurve = () => {
        if (profitHistory.length < 2) return null;
        const width = 300;
        const height = 40;
        const minVal = Math.min(...profitHistory, 0);
        const maxVal = Math.max(...profitHistory, targetProfitValue);
        const range = maxVal - minVal || 1;

        const points = profitHistory.map((val, index) => {
            const x = (index / (profitHistory.length - 1)) * width;
            const y = height - ((val - minVal) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg className="w-full h-10 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <polyline
                    fill="none"
                    stroke={isWin ? "#10b981" : "#f43f5e"}
                    strokeWidth="2"
                    points={points}
                    className="transition-all duration-500"
                />
                {/* Linha de base zero */}
                <line
                    x1="0"
                    y1={height - ((0 - minVal) / range) * height}
                    x2={width}
                    y2={height - ((0 - minVal) / range) * height}
                    stroke="rgba(255,255,255,0.1)"
                    strokeDasharray="3,3"
                />
            </svg>
        );
    };

    // Adiciona um caractere ao padrão personalizado
    const handleAddPatternChar = (char: 'E' | 'O') => {
        const currentArray = patternInput ? patternInput.split(',').map(s => s.trim()) : [];
        if (currentArray.length < 8) {
            const nextArray = [...currentArray, char];
            const nextString = nextArray.join(',');
            setPatternInput(nextString);
            setAutoSequenceTrigger(nextString);
        }
    };

    // Limpa o padrão personalizado
    const handleClearPattern = () => {
        setPatternInput('');
        setAutoSequenceTrigger('');
    };

    // Salva a estratégia personalizada na lista
    const handleSaveStrategy = () => {
        if (!strategyNameInput.trim()) {
            toast.error("Por favor, dê um nome para a sua estratégia.");
            return;
        }
        if (!patternInput) {
            toast.error("Por favor, monte uma sequência de entrada.");
            return;
        }

        const newStrategy = {
            id: `custom-${Date.now()}`,
            name: strategyNameInput.trim(),
            trigger: patternInput,
            entry: autoSequenceEntry,
            isActive: true
        };

        setSavedCustomStrategies((prev: any) => [...prev, newStrategy]);
        setStrategyNameInput('');
        toast.success(`Estratégia "${newStrategy.name}" salva com sucesso!`);
    };

    // Exclui uma estratégia personalizada
    const handleDeleteStrategy = (id: string) => {
        setSavedCustomStrategies((prev: any) => prev.filter((s: any) => s.id !== id));
        toast.info("Estratégia excluída.");
    };

    // Alterna o status ativo de uma estratégia
    const handleToggleStrategy = (id: string, isActive: boolean) => {
        setSavedCustomStrategies((prev: any) => prev.map((s: any) => s.id === id ? { ...s, isActive } : s));
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-1 pb-6">
            
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

            {/* Painel Central Unificado - Estética "Cyber-Luxury AI Core" */}
            <Card className="relative overflow-hidden bg-slate-950/80 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-[2.5rem] transition-all duration-500 hover:border-cyan-500/30">
                {/* Efeitos de Fundo Decorativos */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
                <div className="absolute inset-0 ai-scanline opacity-5 pointer-events-none" />
                
                <CardContent className="p-4 sm:p-5 space-y-4 relative z-10">
                    {/* Header com Branding */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl blur opacity-25" />
                                <div className="h-10 w-10 bg-slate-900 rounded-xl p-0.5 shadow-2xl border border-white/10 overflow-hidden">
                                    {selectedAIInfo?.image ? (
                                        <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800"><Bot className="h-4 w-4 text-cyan-400" /></div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <h2 className="text-sm font-black text-white italic tracking-tighter">WAVE SNIPER</h2>
                                    <div className="px-1 py-0.5 bg-cyan-500/20 rounded border border-cyan-500/30">
                                        <span className="text-[6px] font-black text-cyan-400 uppercase">PRO</span>
                                    </div>
                                </div>
                                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">Neural Engine v2.4.0</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            {/* Botão de Mute/Unmute */}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                onClick={toggleMute}
                            >
                                {isMuted ? (
                                    <VolumeX className="h-3 w-3 text-rose-400" />
                                ) : (
                                    <Volume2 className="h-3 w-3 text-emerald-400" />
                                )}
                            </Button>
                            {/* Botão de Diagnóstico de Performance */}
                            <DiagnosticsModal />
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                    <FileSpreadsheet className="h-3 w-3 text-slate-300" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all" onClick={exitToSelection}>
                                <Power className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Display de Lucro Hero */}
                    <div className="flex flex-col items-center py-1 relative">
                        <div className={cn(
                            "absolute inset-0 blur-[60px] opacity-15 -z-10 transition-all duration-1000",
                            isWin ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        
                        <div className="flex items-center gap-1 mb-0.5">
                            {isWin ? <TrendingUp className="h-2.5 w-2.5 text-emerald-400" /> : <TrendingDown className="h-2.5 w-2.5 text-rose-400" />}
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Resultado da Sessão</span>
                        </div>
                        
                        <div className={cn(
                            "text-4xl sm:text-5xl font-black tracking-tighter leading-none transition-all duration-700 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]",
                            isWin ? "text-emerald-400" : "text-rose-400"
                        )}>
                            <span className="text-xl opacity-40 mr-0.5 font-medium font-sans">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Barra de Progresso Neon da Meta Diária (Integrada) */}
                    {isBotRunning && (
                        <div className="bg-slate-900/30 border border-white/5 rounded-xl p-2 space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1"><Award className="h-2.5 w-2.5 text-yellow-400" /> Progresso da Meta</span>
                                <span className="text-cyan-400">{goalProgressPercentage.toFixed(0)}%</span>
                            </div>
                            <Progress 
                                value={goalProgressPercentage} 
                                className="h-1 bg-slate-900 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500 shadow-[0_0_8px_rgba(34,211,238,0.15)]"
                            />
                        </div>
                    )}

                    {/* Gráfico de Curva de Patrimônio (Equity Curve) */}
                    {profitHistory.length > 1 && (
                        <div className="bg-slate-900/30 border border-white/5 rounded-xl p-2 space-y-1">
                            <div className="flex justify-between items-center text-[7px] font-bold text-slate-500 uppercase tracking-wider">
                                <span className="flex items-center gap-1"><BarChart3 className="h-2.5 w-2.5" /> Curva de Patrimônio</span>
                                <span>Tempo Real</span>
                            </div>
                            {renderEquityCurve()}
                        </div>
                    )}

                    {/* Painel Premium de 8 Dígitos Recentes (Integrado) */}
                    <RecentDigitsPanel />

                    {/* Painel de Monitoramento de Loss Virtual (Integrado) */}
                    <VirtualLossDisplay />

                    {/* AI Thought Stream (Integrado) */}
                    {isBotRunning && (
                        <div className="relative bg-slate-900/30 rounded-xl p-3 flex items-start gap-2.5 border border-white/5">
                            <div className="mt-1 h-1 w-1 rounded-full bg-cyan-400 animate-ping shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <MessageSquare className="h-2.5 w-2.5 text-cyan-400" />
                                    <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Fluxo_Cognitivo</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-300 leading-relaxed italic">
                                    "{aiThought}"
                                    <span className="inline-block w-1 h-2 bg-cyan-400 ml-1 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- PAINÉIS AVANÇADOS OCULTÁVEIS (CONSOLE INTELIGENTE) --- */}
                    {showConsole && (
                        <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                            
                            {/* CONFIGURAÇÕES DE ESTRATÉGIA (NOVO) */}
                            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                    <Settings className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ajustes de Estratégia</span>
                                </div>

                                {/* Toggle Loss Virtual */}
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white">Loss Virtual (L L W)</span>
                                        <span className="text-[8px] text-slate-400">Simula 2 perdas e 1 vitória antes de entrar real</span>
                                    </div>
                                    <Switch 
                                        checked={isVirtualLossActive} 
                                        onCheckedChange={setIsVirtualLossActive} 
                                    />
                                </div>

                                {/* Toggle Padrão Personalizado */}
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white">Padrão Personalizado</span>
                                        <span className="text-[8px] text-slate-400">Crie sua própria sequência de Par/Ímpar</span>
                                    </div>
                                    <Switch 
                                        checked={autoSequenceActive} 
                                        onCheckedChange={setAutoSequenceActive} 
                                    />
                                </div>

                                {/* Configuração do Padrão Personalizado */}
                                {autoSequenceActive && (
                                    <div className="space-y-2.5 pt-2 border-t border-white/5 animate-in fade-in duration-300">
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Nome da Estratégia</span>
                                            <Input 
                                                value={strategyNameInput}
                                                onChange={(e) => setStrategyNameInput(e.target.value)}
                                                placeholder="Ex: Sniper de Pares"
                                                className="h-8 text-[10px] bg-slate-950/60 border-white/5 text-white"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Sequência de Entrada</span>
                                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950/60 border border-white/5 min-h-[36px] flex-wrap">
                                                {patternInput ? patternInput.split(',').map((char, idx) => (
                                                    <span 
                                                        key={idx} 
                                                        className={cn(
                                                            "text-[9px] font-black px-1.5 py-0.5 rounded",
                                                            char === 'E' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                        )}
                                                    >
                                                        {char === 'E' ? 'PAR' : 'ÍMPAR'}
                                                    </span>
                                                )) : (
                                                    <span className="text-[8px] text-slate-500 italic">Monte sua sequência abaixo...</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Botões para montar a sequência */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleAddPatternChar('E')}
                                                className="h-7 text-[8px] font-bold uppercase border-white/10 hover:bg-white/5"
                                            >
                                                <Plus className="h-3 w-3 mr-1 text-emerald-400" /> PAR
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleAddPatternChar('O')}
                                                className="h-7 text-[8px] font-bold uppercase border-white/10 hover:bg-white/5"
                                            >
                                                <Plus className="h-3 w-3 mr-1 text-rose-400" /> ÍMPAR
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={handleClearPattern}
                                                className="h-7 text-[8px] font-bold uppercase text-rose-400 hover:bg-rose-500/10"
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" /> Limpar
                                            </Button>
                                        </div>

                                        {/* Aposta após a sequência */}
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Ação após sequência</span>
                                            <Select value={autoSequenceEntry} onValueChange={(v) => setAutoSequenceEntry(v as 'EVEN' | 'ODD')}>
                                                <SelectTrigger className="h-8 text-[9px] font-bold uppercase bg-slate-950/60 border-white/5">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-950 border-white/10 text-white">
                                                    <SelectItem value="EVEN" className="text-[9px] font-bold">Apostar em PAR</SelectItem>
                                                    <SelectItem value="ODD" className="text-[9px] font-bold">Apostar em ÍMPAR</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Botão de Salvar Estratégia */}
                                        <Button 
                                            onClick={handleSaveStrategy}
                                            className="w-full h-8 text-[9px] font-black uppercase tracking-wider bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg"
                                        >
                                            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar Estratégia na Memória
                                        </Button>

                                        {/* Lista de Estratégias Salvas */}
                                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Estratégias Salvas</span>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                                {savedCustomStrategies && savedCustomStrategies.length > 0 ? (
                                                    savedCustomStrategies.map((strat: any) => (
                                                        <div key={strat.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-white/5">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-bold text-white truncate">{strat.name}</span>
                                                                <span className="text-[8px] text-slate-400 truncate">
                                                                    Seq: {strat.trigger} → {strat.entry === 'EVEN' ? 'PAR' : 'ÍMPAR'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Switch 
                                                                    checked={strat.isActive}
                                                                    onCheckedChange={(checked) => handleToggleStrategy(strat.id, checked)}
                                                                />
                                                                <Button 
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-6 w-6 text-rose-400 hover:bg-rose-500/10"
                                                                    onClick={() => handleDeleteStrategy(strat.id)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[8px] text-slate-500 italic text-center py-2">Nenhuma estratégia salva.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Monitor de Sinais - Versão Avançada e Discreta (Estilo Terminal de Operações) */}
                            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5">
                                        <Terminal className="h-3 w-3 text-cyan-500/70" />
                                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">NEURAL_CONSOLE_FEED</span>
                                        <span className="h-1 w-1 rounded-full bg-cyan-500 animate-pulse" />
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-all" 
                                        onClick={resetOperations}
                                    >
                                        <RotateCcw className="h-2.5 w-2.5 text-slate-400" />
                                    </Button>
                                </div>
                                
                                <ScrollArea className="h-28 pr-1">
                                    <div className="space-y-1 font-mono text-[9px]">
                                        {signals.length > 0 ? signals.map((s: any) => {
                                            const label = getSignalLabel(s.signal, s.strategy);
                                            const hasFinished = typeof s.profit === 'number';
                                            
                                            return (
                                                <div 
                                                    key={s.id} 
                                                    className={cn(
                                                        "flex items-center justify-between py-1 px-2 rounded border transition-all duration-300",
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
                                                        <span className="font-bold truncate max-w-[120px]">
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
                                            <div className="py-6 text-center border border-dashed border-white/5 rounded-lg">
                                                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                                                    [AGUARDANDO_GATILHOS_NEURAIS]
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    {/* Botão de Ignição */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado') || isPaused || isManipulationDetected}
                        className={cn(
                            "group relative w-full h-14 rounded-xl overflow-hidden transition-all duration-500 shadow-2xl active:scale-95",
                            isBotRunning 
                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20" 
                                : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-cyan-500/20"
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <span className="relative flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
                            {isBotRunning ? (
                                <>PARAR<Power className="h-3.5 w-3.5" /></>
                            ) : (
                                <>INICIAR<BrainCircuit className="h-3.5 w-3.5" /></>
                            )}
                        </span>
                    </Button>

                    {/* Seção de Entradas Manuais */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entradas Manuais</span>
                            {isTradePending && (
                                <span className="text-[7px] font-bold text-cyan-400 animate-pulse uppercase">Operação em andamento...</span>
                            )}
                        </div>
                        
                        {/* Botões de Paridade */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => manualBuy('DIGITEVEN', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                            >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                PAR
                            </Button>
                            <Button
                                onClick={() => manualBuy('DIGITODD', 'Manual')}
                                disabled={!isConnected || isTradePending}
                                className="h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95"
                            >
                                <ArrowDownRight className="h-3.5 w-3.5" />
                                ÍMPAR
                            </Button>
                        </div>
                    </div>

                    {/* Wallet / Balance Section */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                            <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shadow-inner transition-colors duration-500",
                                accountType === 'real' ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
                            )}>
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                                    Saldo
                                </p>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-400">$</span>
                                    <p className="text-base font-black text-white tracking-tighter leading-none">
                                        {accountBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 hover:rotate-180 transition-all duration-500" 
                            onClick={() => handleConnect(accountType, currentToken)}
                        >
                            <RefreshCw className="h-3 w-3 text-slate-400" />
                        </Button>
                    </div>

                    {/* Botão de Alternância do Console Avançado */}
                    <div className="flex justify-center pt-1 border-t border-white/5">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowConsole(!showConsole)}
                            className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-cyan-400 transition-colors gap-1.5 h-7"
                        >
                            <Terminal className="h-3 w-3" />
                            {showConsole ? "Ocultar Console I.A" : "Mostrar Console I.A"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};