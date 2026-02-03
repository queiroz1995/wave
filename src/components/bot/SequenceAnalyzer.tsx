"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidersHorizontal } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SequenceStats {
    [length: number]: number;
}

export const SequenceAnalyzer = () => {
    const { 
        lastDigits = [], 
        analyzerWindowSize = 100, 
        setAnalyzerWindowSize,
        patternLengthForAnalysis = 3,
        setPatternLengthForAnalysis,
        digitTradeMode = 'evenOdd',
        digitPrediction = 1
    } = useBotContext();

    // Cálculo das sequências consecutivas (Par/Ímpar) - NOVA LÓGICA
    const consecutiveStats = React.useMemo(() => {
        const digitsToAnalyze = (lastDigits || []).slice(0, analyzerWindowSize);
        if (digitsToAnalyze.length < 2) return { oddSequences: {}, evenSequences: {} };

        const oddSequences: SequenceStats = {};
        const evenSequences: SequenceStats = {};
        let currentSequenceLength = 0;
        let currentParity: 'ODD' | 'EVEN' | null = null;

        // Percorre do mais antigo para o mais novo
        const reversedDigits = [...digitsToAnalyze].reverse();

        for (const digit of reversedDigits) {
            const parity = digit % 2 === 0 ? 'EVEN' : 'ODD';
            
            if (parity === currentParity) {
                currentSequenceLength++;
            } else {
                // Registra a sequência que terminou
                if (currentParity && currentSequenceLength > 1) {
                    const target = currentParity === 'ODD' ? oddSequences : evenSequences;
                    target[currentSequenceLength] = (target[currentSequenceLength] || 0) + 1;
                }
                currentParity = parity;
                currentSequenceLength = 1;
            }
        }
        
        // Registrar a última sequência em aberto
        if (currentParity && currentSequenceLength > 1) {
            const target = currentParity === 'ODD' ? oddSequences : evenSequences;
            target[currentSequenceLength] = (target[currentSequenceLength] || 0) + 1;
        }

        return { oddSequences, evenSequences };
    }, [lastDigits, analyzerWindowSize]);

    // Cálculo das estatísticas de padrões (IA Local)
    const analyzerPatternStats = React.useMemo(() => {
        const digits = (lastDigits || []).slice(0, analyzerWindowSize);
        if (digits.length < patternLengthForAnalysis + 1) return [];

        const chars = digitTradeMode === 'evenOdd'
            ? digits.map(d => d % 2 === 0 ? 'E' : 'O').reverse()
            : digits.map(d => d > digitPrediction ? 'A' : 'B').reverse();

        const patternMap = new Map<string, { occurrences: number, evenWins: number, oddWins: number }>();

        for (let i = 0; i <= chars.length - patternLengthForAnalysis - 1; i++) {
            const pattern = chars.slice(i, i + patternLengthForAnalysis).join('');
            const nextOutcome = chars[i + patternLengthForAnalysis];

            if (!patternMap.has(pattern)) {
                patternMap.set(pattern, { occurrences: 0, evenWins: 0, oddWins: 0 });
            }

            const stats = patternMap.get(pattern)!;
            stats.occurrences++;
            
            if (digitTradeMode === 'evenOdd') {
                if (nextOutcome === 'E') stats.evenWins++;
                else stats.oddWins++;
            } else {
                if (nextOutcome === 'A') stats.evenWins++; 
                else stats.oddWins++;
            }
        }

        return Array.from(patternMap.entries())
            .map(([pattern, stats]) => ({
                pattern,
                occurrences: stats.occurrences,
                winRateEven: (stats.evenWins / stats.occurrences) * 100,
                winRateOdd: (stats.oddWins / stats.occurrences) * 100
            }))
            .sort((a, b) => b.occurrences - a.occurrences)
            .slice(0, 15);
    }, [lastDigits, analyzerWindowSize, patternLengthForAnalysis, digitTradeMode, digitPrediction]);

    const renderConsecutiveTable = (data: SequenceStats, title: string, colorClass: string, headerColor: string) => {
        const sortedEntries = Object.entries(data || {}).sort(([a], [b]) => Number(b) - Number(a));
        return (
            <div className="flex-1 min-w-[140px]">
                <div className={cn("text-[10px] font-bold uppercase p-2 rounded-t-md text-center text-white", headerColor)}>
                    {title}
                </div>
                <div className="border border-t-0 rounded-b-md overflow-hidden bg-muted/20">
                    <Table>
                        <TableBody>
                            {sortedEntries.length > 0 ? sortedEntries.map(([length, count]) => (
                                <TableRow key={length} className="hover:bg-transparent border-b last:border-0">
                                    <TableCell className="p-2 text-xs font-medium">Repetiu {length}x</TableCell>
                                    <TableCell className={cn("p-2 text-xs text-right font-bold", colorClass)}>{count} vezes</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="p-4 text-center text-[10px] text-muted-foreground italic">
                                        Sem repetições.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-4 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-primary text-sm font-bold">
                    <SlidersHorizontal className="h-4 w-4" />Analisador de Sequências
                </CardTitle>
                <CardDescription className="text-[10px]">Análise técnica de repetições e padrões.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0 space-y-4 flex flex-col min-h-0">
                
                <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-[10px] text-muted-foreground">Histórico</Label>
                            <span className="text-[10px] font-bold text-primary">{analyzerWindowSize}d</span>
                        </div>
                        <Slider 
                            value={[analyzerWindowSize]} 
                            onValueChange={(val) => setAnalyzerWindowSize(val[0])} 
                            min={20} max={250} step={10} 
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-[10px] text-muted-foreground">Padrão</Label>
                            <span className="text-[10px] font-bold text-primary">{patternLengthForAnalysis}d</span>
                        </div>
                        <Slider 
                            value={[patternLengthForAnalysis]} 
                            onValueChange={(val) => setPatternLengthForAnalysis(val[0])} 
                            min={1} max={5} step={1} 
                        />
                    </div>
                </div>
                
                <Tabs defaultValue="consecutive" className="w-full flex-grow flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                        <TabsTrigger value="consecutive" className="text-[10px] py-1">Repetições</TabsTrigger>
                        <TabsTrigger value="outcomes" className="text-[10px] py-1">Padrões IA</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="consecutive" className="flex-grow mt-3 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {renderConsecutiveTable(consecutiveStats.evenSequences, "Sequências de Par", "text-green-500", "bg-green-600/80")}
                            {renderConsecutiveTable(consecutiveStats.oddSequences, "Sequências de Ímpar", "text-red-500", "bg-red-600/80")}
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center mt-4 italic">
                            * Sequências mínimas de 2 dígitos.
                        </p>
                    </TabsContent>
                    
                    <TabsContent value="outcomes" className="flex-grow mt-3 overflow-y-auto custom-scrollbar">
                        <ScrollArea className="h-full border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                    <TableRow className="h-8">
                                        <TableHead className="text-[10px] p-2">Padrão</TableHead>
                                        <TableHead className="text-[10px] p-2">Ocorr.</TableHead>
                                        <TableHead className="text-[10px] p-2 text-green-500">Par%</TableHead>
                                        <TableHead className="text-[10px] p-2 text-red-500">Ímpar%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(analyzerPatternStats || []).length > 0 ? analyzerPatternStats.map(({ pattern, occurrences, winRateEven, winRateOdd }: any) => (
                                        <TableRow key={pattern} className="h-8 hover:bg-muted/30">
                                            <TableCell className="p-2">
                                                <div className="flex gap-0.5">
                                                    {pattern.split('').map((char: string, i: number) => (
                                                        <span key={i} className={cn(
                                                            "w-3 h-3 rounded-[2px] text-[8px] flex items-center justify-center text-white font-bold",
                                                            char === 'E' || char === 'A' ? 'bg-green-500' : 'bg-red-500'
                                                        )}>
                                                            {char}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2 text-[10px]">{occurrences}</TableCell>
                                            <TableCell className={cn("p-2 text-[10px] font-bold", winRateEven > 55 ? "text-green-500" : "text-muted-foreground")}>
                                                {winRateEven.toFixed(0)}%
                                            </TableCell>
                                            <TableCell className={cn("p-2 text-[10px] font-bold", winRateOdd > 55 ? "text-red-500" : "text-muted-foreground")}>
                                                {winRateOdd.toFixed(0)}%
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-[10px] text-muted-foreground h-20">
                                                Sem padrões.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};