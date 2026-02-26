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

    // Cálculo das sequências consecutivas (Par/Ímpar)
    const consecutiveStats = React.useMemo(() => {
        const digitsToAnalyze = (lastDigits || []).slice(0, analyzerWindowSize);
        if (digitsToAnalyze.length < 2) return { oddSequences: {}, evenSequences: {} };

        const oddSequences: SequenceStats = {};
        const evenSequences: SequenceStats = {};
        let currentSequenceLength = 0;
        let currentParity: 'ODD' | 'EVEN' | null = null;

        for (const digit of digitsToAnalyze) {
            const parity = digit % 2 === 0 ? 'EVEN' : 'ODD';
            if (parity === currentParity) {
                currentSequenceLength++;
            } else {
                if (currentParity && currentSequenceLength > 0) {
                    const target = currentParity === 'ODD' ? oddSequences : evenSequences;
                    target[currentSequenceLength] = (target[currentSequenceLength] || 0) + 1;
                }
                currentParity = parity;
                currentSequenceLength = 1;
            }
        }
        if (currentParity && currentSequenceLength > 0) {
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
                if (nextOutcome === 'A') stats.evenWins++; // "A" representa o lado positivo/acima
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

    const renderConsecutiveTable = (data: SequenceStats, title: string, colorClass: string) => {
        const sortedEntries = Object.entries(data || {}).sort(([a], [b]) => Number(b) - Number(a));
        return (
            <div>
                <h3 className={`font-semibold text-center mb-2 ${colorClass}`}>{title}</h3>
                <ScrollArea className="h-56 border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm">
                            <TableRow>
                                <TableHead>Sequência de</TableHead>
                                <TableHead className="text-right">Ocorrências</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEntries.length > 0 ? sortedEntries.map(([length, count]) => (
                                <TableRow key={length}>
                                    <TableCell>{length} Dígitos</TableCell>
                                    <TableCell className="text-right font-bold">{count}x</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">Nenhuma sequência.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        );
    };

    return (
        <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-primary text-base">
                    <SlidersHorizontal className="h-5 w-5" />Analisador de Sequências
                </CardTitle>
                <CardDescription>Analise os últimos dígitos para encontrar padrões e tendências.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0 space-y-4 flex flex-col">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="analyzer-window">Janela de Análise (Dígitos)</Label>
                            <span className="font-bold text-primary">{analyzerWindowSize}</span>
                        </div>
                        <Slider 
                            id="analyzer-window" 
                            value={[analyzerWindowSize]} 
                            onValueChange={(val) => setAnalyzerWindowSize(val[0])} 
                            min={10} 
                            max={250} 
                            step={10} 
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="pattern-length">Tamanho do Padrão</Label>
                            <span className="font-bold text-primary">{patternLengthForAnalysis}</span>
                        </div>
                        <Slider 
                            id="pattern-length" 
                            value={[patternLengthForAnalysis]} 
                            onValueChange={(val) => setPatternLengthForAnalysis(val[0])} 
                            min={1} 
                            max={5} 
                            step={1} 
                        />
                    </div>
                </div>
                
                <Tabs defaultValue="outcomes" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="outcomes">Análise de Padrões</TabsTrigger>
                        <TabsTrigger value="consecutive">Sequências Consecutivas</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="consecutive" className="flex-grow mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {renderConsecutiveTable(consecutiveStats.oddSequences, "Ímpar", "text-red-500")}
                            {renderConsecutiveTable(consecutiveStats.evenSequences, "Par", "text-green-500")}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="outcomes" className="flex-grow mt-4 space-y-4 flex flex-col">
                        <ScrollArea className="flex-grow border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>Padrão</TableHead>
                                        <TableHead>Ocorr.</TableHead>
                                        <TableHead className="text-green-500">Win% (Lado A)</TableHead>
                                        <TableHead className="text-red-500">Win% (Lado B)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(analyzerPatternStats || []).length > 0 ? analyzerPatternStats.map(({ pattern, occurrences, winRateEven, winRateOdd }: any) => (
                                        <TableRow key={pattern}>
                                            <TableCell className="font-mono">
                                                <div className="flex gap-1">
                                                    {pattern.split('').map((char: string, i: number) => (
                                                        <Badge key={i} className={cn(
                                                            char === 'E' || char === 'A' ? 'bg-green-500/80' : 'bg-red-500/80'
                                                        )}>
                                                            {char}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>{occurrences}</TableCell>
                                            <TableCell className={cn("font-bold", winRateEven > winRateOdd && "text-green-400")}>
                                                {winRateEven.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className={cn("font-bold", winRateOdd > winRateEven && "text-red-400")}>
                                                {winRateOdd.toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                                Nenhum padrão encontrado.
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