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

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-primary"><FileText className="h-5 w-5" />Log de Operações</CardTitle>
                <Button variant="ghost" size="icon" onClick={clearLogs} className="h-8 w-8"><Trash2 className="h-4 w-4" /><span className="sr-only">Limpar Logs</span></Button>
            </CardHeader>
            <CardContent>
                <div ref={logContainerRef} className="h-80 bg-background/80 rounded-md p-2 overflow-y-auto space-y-1 custom-scrollbar futuristic-log-bg shadow-[inset_0_0_10px_hsl(var(--primary)/0.2)]">
                    {logs.length > 0 ? (logs.map((log, index) => <LogItem key={index} log={log} />)) : (<div className="flex items-center justify-center h-full text-muted-foreground">Aguardando operações...</div>)}
                    {isBotRunning && <div className="flex items-center space-x-2"><span className="text-muted-foreground/80 min-w-[60px]">{new Date().toLocaleTimeString('pt-BR', { hour12: false })}</span><div className="w-2 h-4 bg-primary animate-pulse"></div></div>}
                </div>
            </CardContent>
        </Card>
    );
};