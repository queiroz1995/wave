"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Power, RefreshCw, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { QuickConfigModal } from './QuickConfigModal';

export const AIOperatingScreen = () => {
    const { 
        selectedAIInfo, totalProfit, accountBalance, 
        isBotRunning, toggleBot, exitToSelection, 
        status, tradeStatus, wins, losses, signals, clearSignals,
        handleConnect, accountType, realToken, demoToken
    } = useBotContext();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const isWin = totalProfit >= 0;
    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleStartClick = () => {
        if (isBotRunning) {
            toggleBot();
        } else {
            setIsConfigModalOpen(true);
        }
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* CARD PRINCIPAL */}
            <Card className="glass-panel border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden rounded-[3rem]">
                <CardContent className="p-10 space-y-10">
                    {/* Header Simplificado */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-primary/10 rounded-2xl">
                                {selectedAIInfo && <selectedAIInfo.icon className="h-7 w-7 text-primary" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedAIInfo?.name}</h2>
                                <Badge variant="secondary" className="text-[9px] font-black px-2 py-0 uppercase tracking-widest bg-primary/5 text-primary border-none">
                                    {selectedAIInfo?.style}
                                </Badge>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors" 
                            onClick={exitToSelection}
                        >
                            <Power className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Botão de Ação Único */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado')}
                        className={cn(
                            "w-full h-20 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30 scale-[0.98]" 
                                : "bg-primary hover:bg-primary/90 shadow-primary/30"
                        )}
                    >
                        {isBotRunning ? "Interromper" : "Play Operação"}
                    </Button>

                    {/* Display de Lucro */}
                    <div className="text-center space-y-2 pt-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Live Profit</p>
                        <div className={cn(
                            "text-7xl font-black tracking-tighter flex items-center justify-center gap-3",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                    </div>

                    {/* Saldo */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm">
                                <RefreshCw className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Saldo em Conta</p>
                                <p className="text-xl font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'} <span className="text-xs font-bold opacity-40">USD</span></p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Timelines de Status */}
            <div className="grid grid-cols-3 gap-3 px-2">
                {[
                    { label: 'Análise', active: isBotRunning && tradeStatus === 'IDLE', color: 'bg-blue-500' },
                    { label: 'Aposta', active: tradeStatus === 'SENDING', color: 'bg-green-500' },
                    { label: 'Contrato', active: tradeStatus === 'ACTIVE', color: 'bg-yellow-500' }
                ].map((step, i) => (
                    <div key={i} className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-500",
                        step.active ? "bg-white shadow-lg border-primary/20 scale-105" : "bg-white/40 border-transparent opacity-40"
                    )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", step.active ? step.color : "bg-gray-300", step.active && "animate-pulse")} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{step.label}</span>
                    </div>
                ))}
            </div>

            {/* Histórico */}
            <Card className="glass-panel border-none rounded-[2.5rem] overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-gray-50/30">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Relatório de Voo</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 text-[11px] font-black">
                            <span className="text-green-500">W: {wins}</span>
                            <span className="text-red-500">L: {losses}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={clearSignals}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <ScrollArea className="h-56">
                    <div className="px-6 pb-6">
                        <table className="w-full text-[11px] font-bold">
                            <tbody className="divide-y divide-gray-50">
                                {signals.length > 0 ? signals.map((s: any) => (
                                    <tr key={s.id}>
                                        <td className="py-4 font-mono text-[10px] opacity-40">{s.timestamp}</td>
                                        <td className="py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                                                s.signal === 'EVEN' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                            )}>
                                                {s.signal === 'EVEN' ? 'PAR' : 'ÍMPAR'}
                                            </span>
                                        </td>
                                        <td className={cn("py-4 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                            {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Neural_Link_Standby</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </Card>

            <QuickConfigModal 
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onConfirm={confirmStart}
            />
        </div>
    );
};