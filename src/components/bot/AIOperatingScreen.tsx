"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, Trash2, Bot, ShieldAlert, Timer, TrendingUp, Target, Radar, DollarSign, FileSpreadsheet, Settings, BrainCircuit, Activity, Zap, Volume2, VolumeX, Swords, Globe, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QuickConfigModal } from './QuickConfigModal';
import { VirtualLossDisplay } from './VirtualLossDisplay';
import { Progress } from "@/components/ui/progress";
import { SettingsSheet } from './SettingsSheet';
import { BackgroundMarketChart } from './BackgroundMarketChart';

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
                if (prev.length <= 1) return prev;
                return prev.filter(m => m !== id);
            }
            return [...prev, id];
        });
    };

    const getSignalLabel = (signal: string) => {
        switch (signal) {
            case 'EVEN': return { text: 'PAR', color: 'bg-green-100/50 text-green-600 border-green-200/50' };
            case 'ODD': return { text: 'ÍMPAR', color: 'bg-red-100/50 text-red-600 border-red-200/50' };
            case 'OVER': return { text: 'ACIMA', color: 'bg-blue-100/50 text-blue-600 border-blue-200/50' };
            default: return { text: signal, color: 'bg-gray-100/50 text-gray-600 border-gray-200/50' };
        }
    };

    const attackModes = [
        { id: 'sweep', label: 'SWEEP', desc: 'Vassourilha $0.35' },
        { id: '1+', label: '1+', desc: '90% Win' },
        { id: '2+', label: '2+', desc: '80% Win' },
        { id: 'traditional', label: 'PAR/IMP', desc: 'Tendência' },
    ];

    return (
        <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
            
            {/* Seleção de Modos HUD */}
            <div className="bg-white/20 backdrop-blur-md border border-white/40 p-1.5 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm">
                <div className="grid grid-cols-4 gap-1">
                    {attackModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => toggleAttackMode(mode.id)}
                            disabled={isBotRunning}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 rounded-xl sm:rounded-2xl transition-all duration-300 relative overflow-hidden group",
                                attackMode.includes(mode.id) 
                                    ? "bg-primary text-white shadow-lg scale-100" 
                                    : "text-muted-foreground hover:bg-white/30 opacity-40",
                                isBotRunning && !attackMode.includes(mode.id) && "opacity-10"
                            )}
                        >
                            {attackMode.includes(mode.id) && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                            )}
                            <span className="text-[8px] sm:text-[9px] font-black tracking-widest relative z-10">{mode.label}</span>
                            <span className="hidden sm:inline text-[7px] font-bold opacity-70 uppercase truncate w-full px-1 relative z-10">{mode.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Status de Processamento */}
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
                            <div className="absolute inset-0 bg-current opacity-20 blur-lg" />
                        </div>
                        <div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", isStudying ? "text-blue-600" : "text-green-600")}>
                                {isStudying ? "Protocolo de Análise" : "Motor Vortex Hunter"}
                            </p>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80 italic">
                                {isStudying ? `Aguardando Sincronismo... (${studyTicksCount}/5)` : "Fluxo de Dados Confirmado"}
                            </p>
                        </div>
                    </div>
                    {!isStudying && <Zap className="h-4 w-4 text-green-500 fill-current animate-bounce" />}
                </div>
            )}

            <VirtualLossDisplay />

            {/* PAINEL PRINCIPAL CORE */}
            <Card className="glass-panel border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] relative group">
                
                {/* GRÁFICO DE MERCADO NO FUNDO */}
                <BackgroundMarketChart />

                {/* ELEMENTOS HOLOGRÁFICOS DE FUNDO */}
                {isBotRunning && (
                    <>
                        {/* Scanner Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-[scan_3s_linear_infinite] z-20 pointer-events-none" />
                        
                        {/* Data Nodes */}
                        <div className="absolute top-1/4 left-1/4 h-1 w-1 bg-blue-400 rounded-full animate-ping opacity-40" />
                        <div className="absolute bottom-1/3 right-1/4 h-1 w-1 bg-blue-400 rounded-full animate-ping delay-700 opacity-40" />
                        <div className="absolute top-1/2 right-10 h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse opacity-30" />

                        {/* Globo Holográfico Central Avançado */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.07] scale-150">
                            <div className="relative">
                                {/* Anéis Orbitais */}
                                <div className="absolute inset-0 border-[3px] border-blue-500/40 rounded-full scale-[1.1] animate-[spin_8s_linear_infinite]" />
                                <div className="absolute inset-0 border-[1px] border-blue-400/30 rounded-full scale-[1.3] animate-[spin_12s_linear_infinite_reverse] border-dashed" />
                                
                                <Globe className="h-48 w-48 sm:h-64 sm:w-64 text-blue-600 animate-[spin_15s_linear_infinite]" />
                                
                                {/* Core Glow */}
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />
                            </div>
                        </div>
                    </>
                )}

                <CardContent className="p-8 sm:p-12 space-y-8 sm:space-y-10 relative z-10">
                    {/* Header do Perfil */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/40 backdrop-blur-md rounded-2xl p-1 shadow-inner border border-white/50 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                {selectedAIInfo?.image ? (
                                    <img src={selectedAIInfo.image} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50/20"><Bot className="h-6 w-6 text-primary" /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                                    {selectedAIInfo?.name || 'WAVE AI'} 
                                    <div className="flex gap-0.5">
                                        <Zap className="h-5 w-5 text-blue-500 fill-current animate-pulse" />
                                    </div>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">Protocolo {attackMode.length}x Ativo</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-12 w-12 rounded-2xl hover:bg-white/20 group/vol"
                                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                            >
                                {isSoundEnabled ? <Volume2 className="h-6 w-6 text-primary group-hover/vol:scale-110" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
                            </Button>
                            <SettingsSheet trigger={
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-blue-50/20 hover:text-blue-600">
                                    <FileSpreadsheet className="h-6 w-6" />
                                </Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-red-50/20 hover:text-red-500" onClick={exitToSelection}>
                                <Power className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    {/* Botão de Ignição */}
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
                            {isBotRunning ? "Stop Process" : "Start System"}
                        </Button>
                        {!isBotRunning && (
                            <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-[3rem] animate-pulse -z-10" />
                        )}
                    </div>

                    {/* HUD de Lucro */}
                    <div className="text-center space-y-2 relative py-4">
                        <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/40 mb-2 shadow-sm">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-80">NET_PROFIT_LIVE</p>
                        </div>
                        <div className={cn(
                            "text-6xl sm:text-8xl font-black tracking-tighter leading-none drop-shadow-sm transition-all duration-500",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-4xl sm:text-5xl opacity-40 mr-1">$</span>
                            {totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Carteira Tech */}
                    <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 sm:p-8 flex items-center justify-between shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] group/wallet hover:shadow-xl transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/5 p-3 sm:p-4 rounded-2xl group-hover/wallet:scale-110 transition-transform">
                                <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                            </div>
                            <div>
                                <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Neural Account Balance</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl sm:text-3xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'}</p>
                                    <span className="text-[10px] font-black text-primary uppercase">USD</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-6 w-6" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Terminal de Transações */}
            <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-[2rem] p-4 overflow-hidden shadow-sm">
                <ScrollArea className="h-44 sm:h-52 px-2">
                    <table className="w-full text-[9px] sm:text-[10px] font-bold">
                        <tbody className="divide-y divide-white/10">
                            {signals.length > 0 ? signals.map((s: any) => {
                                const label = getSignalLabel(s.signal);
                                const hasFinished = typeof s.profit === 'number';
                                
                                return (
                                    <tr key={s.id} className="group/row hover:bg-white/10 transition-colors">
                                        <td className="py-3 font-mono opacity-40 text-[8px]">{s.timestamp}</td>
                                        <td className="py-3">
                                            <span className={cn("px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase border", label.color)}>
                                                {label.text}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center text-muted-foreground opacity-60 uppercase text-[8px] tracking-tight">{s.details.replace('Mirror Inverse: ', 'MI: ')}</td>
                                        <td className={cn(
                                            "py-3 text-right font-black text-xs", 
                                            !hasFinished ? "text-blue-500 animate-pulse" : (s.result === 'WIN' ? "text-green-600" : "text-red-500")
                                        )}>
                                            {hasFinished ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : 'SCANNING...'}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.4em] italic">WAVE_Terminal_Ready</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>

            <QuickConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} onConfirm={confirmStart} />
        </div>
    );
};