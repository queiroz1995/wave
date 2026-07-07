"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Loader2 } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ClosedHistory = () => {
    const { closedHistory, isFetchingHistory, clearClosedHistory } = useBotContext();

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-primary text-base"><Archive className="h-5 w-5" />Histórico Fechado</CardTitle>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={clearClosedHistory} disabled={isFetchingHistory} className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Limpar Histórico</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-2">
                <ScrollArea className="h-full bg-muted/30 rounded-md p-2 custom-scrollbar">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                            <TableRow>
                                <TableHead className="w-[80px]">Horário</TableHead>
                                <TableHead>Ativo</TableHead>
                                <TableHead className="text-right">Dígito</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isFetchingHistory && closedHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Carregando histórico inicial...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : closedHistory.length > 0 ? (
                                closedHistory.map((tick: any, index: number) => (
                                    <TableRow key={`${tick.epoch}-${index}`}>
                                        <TableCell className="font-mono text-xs">
                                            {new Date(tick.epoch * 1000).toLocaleTimeString('pt-BR', { hour12: false })}
                                        </TableCell>
                                        <TableCell className="text-xs">{tick.symbol}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={cn(
                                                "font-bold text-lg",
                                                tick.digit === 0 ? 'bg-blue-500/80' : (tick.digit % 2 === 0 ? 'bg-green-500/80' : 'bg-red-500/80')
                                            )}>
                                                {tick.digit}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        Aguardando histórico em tempo real...
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};