"use client";

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import LogItem from '@/components/LogItem';
import { cn } from '@/lib/utils';

export const OperationLog = () => {
    const { logs, clearLogs, isBotRunning, tradeStatus, activeContractTick, activeContractDigit, duration } = useBotContext();
    const logContainerRef = useRef<HTMLDivElement>(null);
    const MAX_LOGS_DISPLAYED = 30;

    const displayedLogs = [...logs].reverse().slice(0, MAX_LOGS_DISPLAYED);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs]);

    return (
        <Card className="h-full flex flex-col glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-widest">
                    <FileText className="h-4 w-4" />Terminal de Dados
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearLogs} 
                    className="h-7 w-7 hover:bg-gray-100"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Limpar Terminal</span>
                </Button>
            </CardHeader>
            <CardContent className="flex-grow p-0 flex flex-col min-h-0 bg-white">
                <div 
                    ref={logContainerRef} 
                    className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-0.5"
                >
                    {/* Contador de Ticks Futurista e Animado */}
                    {tradeStatus === 'ACTIVE' ? (
                        <div className="flex items-center justify-between pt-1.5 pb-1.5 px-2 border border-cyan-500/30 mb-2 bg-cyan-50/80 rounded-lg animate-pulse">
                            <div className="flex items-center space-x-2">
                                <span className="text-cyan-600 text-[10px] font-mono font-bold">
                                    {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
                                </span>
                                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                                <span className="text-[10px] text-cyan-600 font-black uppercase tracking-wider">CONTRATO ATIVO</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: duration }).map((_, i) => {
                                    const isPassed = i < activeContractTick;
                                    const isCurrent = i === activeContractTick - 1;
                                    return (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "h-2.5 w-5 rounded-sm border transition-all duration-300",
                                                isPassed ? "bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" :
                                                isCurrent ? "bg-cyan-400/50 border-cyan-400 animate-pulse" :
                                                "bg-slate-100 border-gray-200"
                                            )}
                                        />
                                    );
                                })}
                                <span className="text-[10px] font-mono font-black text-cyan-600 ml-1">
                                    {activeContractTick}/{duration} T {activeContractDigit !== null && `(${activeContractDigit})`}
                                </span>
                            </div>
                        </div>
                    ) : isBotRunning && (
                        <div className="flex items-center space-x-2 pt-1 pb-1 px-1 border-b mb-1 bg-blue-50/50 rounded-t-sm">
                            <span className="text-primary text-[10px] min-w-[55px] font-mono font-bold">
                                {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
                            </span>
                            <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-gray-600 font-bold uppercase italic">Neural_Link_Synced...</span>
                        </div>
                    )}
                    
                    {displayedLogs.length > 0 ? (
                        displayedLogs.map((log, index) => <LogItem key={index} log={log} />)
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-xs py-4 font-mono uppercase tracking-[0.2em]">
                            Sem_Atividade...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};