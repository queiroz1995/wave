"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BookCopy } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Cataloger = () => {
    const { 
        genericPatternCatalog, 
        catalogerPatternLength, setCatalogerPatternLength,
        catalogerMinWinRate, setCatalogerMinWinRate,
        catalogerMartingaleLevels, setCatalogerMartingaleLevels,
        catalogerMinOccurrences, setCatalogerMinOccurrences,
    } = useBotContext();

    // Apenas a aba 'Genérico' será mantida.

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-base"><BookCopy className="h-5 w-5" />Catalogador de Padrões</CardTitle>
                <CardDescription>A análise é feita em tempo real com base no histórico de 500 dígitos.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-4 space-y-4 flex flex-col">
                <Tabs defaultValue="generic" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="generic">Análise Genérica</TabsTrigger>
                    </TabsList>
                    <TabsContent value="generic" className="flex-grow mt-4 space-y-4 flex flex-col">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b pb-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><Label>Tamanho do Padrão</Label><span className="font-bold text-primary">{catalogerPatternLength}</span></div>
                                <Slider value={[catalogerPatternLength]} onValueChange={(val) => setCatalogerPatternLength(val[0])} min={1} max={8} step={1} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><Label>Assertividade Mínima</Label><span className="font-bold text-primary">{catalogerMinWinRate}%</span></div>
                                <Slider value={[catalogerMinWinRate]} onValueChange={(val) => setCatalogerMinWinRate(val[0])} min={50} max={100} step={1} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center"><Label>Níveis de Martingale</Label><span className="font-bold text-primary">{catalogerMartingaleLevels}</span></div>
                                <Slider value={[catalogerMartingaleLevels]} onValueChange={(val) => setCatalogerMartingaleLevels(val[0])} min={0} max={5} step={1} />
                            </div>
                        </div>
                        <ScrollArea className="flex-grow border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm"><TableRow>
                                    <TableHead className="p-2 text-xs">Padrão</TableHead>
                                    <TableHead className="p-2 text-xs">Ocorr.</TableHead>
                                    <TableHead className="p-2 text-xs">Entrada</TableHead>
                                    <TableHead className="p-2 text-xs text-right">Assert.</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {genericPatternCatalog && genericPatternCatalog.length > 0 ? (
                                        genericPatternCatalog.map((result: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell className="p-2 text-xs font-mono"><div className="flex gap-1">{result.pattern.split('').map((char: string, i: number) => <Badge key={i} className={cn('text-xs', char === 'E' ? 'bg-green-500/80' : 'bg-red-500/80')}>{char}</Badge>)}</div></TableCell>
                                                <TableCell className="p-2 text-xs">{result.occurrences}</TableCell>
                                                <TableCell className="p-2 text-xs"><Badge variant="outline" className={cn('text-xs', result.entry === 'PAR' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500')}>{result.entry}</Badge></TableCell>
                                                <TableCell className="p-2 text-xs text-right font-bold text-primary">{result.winRate.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum padrão encontrado com os filtros atuais.</TableCell></TableRow>)}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};