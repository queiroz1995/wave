"use client";

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import LogItem from '@/components/LogItem';

export const OperationLog = () => {
    const { logs, clearLogs, isBotRunning } = useBotContext();
    const logContainerRef = useRef<HTMLDivElement>(null);
    const MAX_LOGS_DISPLAYED = 30;

    // 1. Reverte a ordem dos logs para que o mais recente fique no topo
    const displayedLogs = [...logs].reverse().slice(0, MAX_LOGS_DISPLAYED);

    useEffect(() => {
        if (logContainerRef.current) {
            // 2. Rola para o topo (0) quando novos logs são adicionados
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs]);

    return (
        <Card className="h-full flex flex-col bg-card/90 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-bold">
                    <FileText className="h-4 w-4" />Log de Operações
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearLogs} 
                    className="h-7 w-7 hover:bg-destructive/10"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Limpar Logs</span>
                </Button>
            </CardHeader>
            <CardContent className="flex-grow p-0 flex flex-col min-h-0">
                <div 
                    ref={logContainerRef} 
                    className="flex-grow bg-muted/20 rounded-b-md overflow-y-auto custom-scrollbar p-2 space-y-0.5"
                >
                    {/* Adiciona o indicador de 'Aguardando...' no topo, se o bot estiver rodando */}
                    {isBotRunning && (
                        <div className="flex items-center space-x-2 pt-1 pb-1 px-1 whitespace-nowrap border-b border-border/50 mb-1">
                            <span className="text-muted-foreground/60 text-[10px] min-w-[55px] font-mono">
                                {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
                            </span>
                            <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-muted-foreground/80 italic">Aguardando...</span>
                        </div>
                    )}
                    
                    {displayedLogs.length > 0 ? (
                        displayedLogs.map((log, index) => <LogItem key={index} log={log} />)
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground/60 text-xs py-4">
                            Aguardando operações...
                        </div>
                    )}
                </div>
                {logs.length > MAX_LOGS_DISPLAYED && (
                    <div className="text-center text-[10px] text-muted-foreground/70 py-1 border-t border-border/50 bg-muted/30">
                        {logs.length - MAX_LOGS_DISPLAYED} entradas anteriores ocultas
                    </div>
                )}
            </CardContent>
        </Card>
    );
};