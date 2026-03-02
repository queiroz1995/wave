"use client";

import React, { useState } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Power, RefreshCw, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SettingsSheet } from './SettingsSheet';
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
            // Se já estiver rodando, apenas para
            toggleBot();
        } else {
            // Se não estiver rodando, abre o modal de configuração primeiro
            setIsConfigModalOpen(true);
        }
    };

    const confirmStart = () => {
        setIsConfigModalOpen(false);
        toggleBot();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* CARD PRINCIPAL (HEADER) */}
            <Card className="glass-panel border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
                <CardContent className="p-8 space-y-8 bg-gradient-to-b from-white/10 to-transparent">
                    {/* Header: Nome e Botões */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                {selectedAIInfo && <selectedAIInfo.icon className="h-6 w-6 text-primary" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter">{selectedAIInfo?.name}</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedAIInfo?.style}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <SettingsSheet />
                            <Button variant="destructive" size="icon" className="rounded-xl shadow-lg shadow-red-500/20" onClick={exitToSelection}>
                                <Power className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Botão INICIAR */}
                    <Button 
                        onClick={handleStartClick}
                        disabled={status.message.includes('Desconectado')}
                        className={cn(
                            "w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest transition-all duration-300 shadow-xl",
                            isBotRunning 
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" 
                                : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
                        )}
                    >
                        {isBotRunning ? "■ PARAR OPERAÇÃO" : "▶ INICIAR IA"}
                    </Button>

                    {/* Display de LUCRO */}
                    <div className="text-center space-y-1 py-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Lucro / Prejuízo</p>
                        <div className={cn(
                            "text-6xl font-black tracking-tighter flex items-center justify-center gap-2",
                            isWin ? "text-green-500" : "text-red-500"
                        )}>
                            <span className="text-4xl">{isWin ? '↑' : '↓'}</span>
                            {isWin ? '+' : ''}{totalProfit.toFixed(2)}
                        </div>
                        <p className="text-sm font-bold text-muted-foreground/60">USD</p>
                    </div>

                    {/* Saldo Disponível */}
                    <div className="bg-muted/30 border border-white/20 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-lg">
                                <RefreshCw className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                                <p className="text-lg font-black tracking-tight">{accountBalance?.toFixed(2) || '0.00'} <span className="text-xs text-muted-foreground">USD</span></p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleConnect(accountType, currentToken)}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* STATUS DE OPERAÇÃO */}
            <div className="space-y-2 px-2">
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all duration-500",
                    tradeStatus === 'IDLE' ? "bg-white/40 border-white/20" : "bg-blue-500/10 border-blue-500/30"
                )}>
                    <span className="text-xs font-bold uppercase tracking-widest">Analisando Mercado</span>
                    <div className={cn("h-2 w-2 rounded-full", isBotRunning ? "bg-blue-500 animate-pulse" : "bg-gray-300")} />
                </div>
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all duration-500",
                    tradeStatus === 'SENDING' ? "bg-green-500/10 border-green-500/30" : "bg-white/40 border-white/20"
                )}>
                    <span className="text-xs font-bold uppercase tracking-widest">Comprando Contrato</span>
                    <div className={cn("h-2 w-2 rounded-full", tradeStatus === 'SENDING' ? "bg-green-500 animate-bounce" : "bg-gray-300")} />
                </div>
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all duration-500",
                    tradeStatus === 'ACTIVE' ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/40 border-white/20"
                )}>
                    <span className="text-xs font-bold uppercase tracking-widest">Aguardando Resultado</span>
                    <div className={cn("h-2 w-2 rounded-full", tradeStatus === 'ACTIVE' ? "bg-yellow-500 animate-spin" : "bg-gray-300")} />
                </div>
            </div>

            {/* HISTÓRICO DE OPERAÇÕES */}
            <Card className="glass-panel border-none rounded-[2rem] overflow-hidden">
                <div className="p-5 flex justify-between items-center border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Histórico de Operações</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearSignals}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="flex gap-2 text-[10px] font-black">
                            <span className="text-green-500">{wins}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-red-500">{losses}</span>
                        </div>
                    </div>
                </div>
                <ScrollArea className="h-60">
                    <div className="p-0">
                        <table className="w-full text-[11px] font-bold">
                            <thead className="bg-muted/30 text-muted-foreground uppercase text-[9px]">
                                <tr>
                                    <th className="p-3 text-left">Hora</th>
                                    <th className="p-3 text-left">Tipo</th>
                                    <th className="p-3 text-right">Ganho/Perda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {signals.length > 0 ? signals.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-mono opacity-60">{s.timestamp}</td>
                                        <td className="p-3">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase",
                                                s.signal === 'EVEN' ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
                                            )}>
                                                {s.signal === 'EVEN' ? 'PAR' : 'ÍMPAR'}
                                            </Badge>
                                        </td>
                                        <td className={cn("p-3 text-right font-black", s.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                                            {s.profit ? `${s.profit > 0 ? '+' : ''}${s.profit.toFixed(2)}` : '...'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="p-10 text-center text-muted-foreground uppercase text-[10px] tracking-widest italic opacity-40">Nenhuma Operação</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </Card>

            {/* Modal de Configuração Rápida */}
            <QuickConfigModal 
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onConfirm={confirmStart}
            />
        </div>
    );
};