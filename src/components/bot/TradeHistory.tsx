"use client";

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import SignalItem from '@/components/SignalItem';

export const TradeHistory = () => {
    const { signals, clearSignals } = useBotContext();
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [signals]);

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-primary text-base"><History className="h-5 w-5" />Histórico de Resultados</CardTitle>
                <Button variant="ghost" size="icon" onClick={clearSignals} className="h-8 w-8"><Trash2 className="h-4 w-4" /><span className="sr-only">Limpar Histórico</span></Button>
            </CardHeader>
            <CardContent className="flex-grow p-2">
                <div ref={logContainerRef} className="h-full bg-muted/30 rounded-md p-2 overflow-y-auto space-y-1 custom-scrollbar">
                    {signals.length > 0 ? (signals.map((signal) => <SignalItem key={signal.id} signal={signal} />)) : (<div className="flex items-center justify-center h-full text-muted-foreground">Nenhum resultado registrado.</div>)}
                </div>
            </CardContent>

        </Card>
    );
};