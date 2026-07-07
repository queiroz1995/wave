"use client";

import React, { useState, useEffect } from 'react';
import { useBotContext } from '@/context/BotContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/InfoTooltip';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, Delete, Save } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export const OverUnderPatternConfig = () => {
    const {
        overUnderPatternProfiles, setOverUnderPatternProfiles,
        digitPrediction,
    } = useBotContext();

    const [newPatternName, setNewPatternName] = useState('');
    const [newPatternSequence, setNewPatternSequence] = useState('');
    const [newPatternTradeType, setNewPatternTradeType] = useState<'DIGITOVER' | 'DIGITUNDER'>('DIGITOVER');
    const [newPatternBarrier, setNewPatternBarrier] = useState(digitPrediction);

    useEffect(() => {
        // Sync default barrier with global setting when component mounts or digitPrediction changes
        setNewPatternBarrier(digitPrediction);
    }, [digitPrediction]);

    const handleAddDigit = (digit: 'A' | 'B') => {
        if (newPatternSequence.length < 10) {
            setNewPatternSequence(prev => prev + digit);
        }
    };

    const handleRemoveLast = () => {
        setNewPatternSequence(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setNewPatternSequence('');
    };

    const handleSavePattern = () => {
        if (!newPatternName) {
            toast.error("O nome do padrão não pode estar vazio.");
            return;
        }
        if (!newPatternSequence) {
            toast.error("A sequência não pode estar vazia para ser salva.");
            return;
        }
        if (overUnderPatternProfiles[newPatternName]) {
            toast.error("Já existe um padrão com este nome.");
            return;
        }
        
        // Validation for barrier based on trade type
        if (newPatternTradeType === 'DIGITOVER' && newPatternBarrier === 9) {
            toast.error("Para apostar 'Acima', a barreira não pode ser 9.");
            return;
        }
        if (newPatternTradeType === 'DIGITUNDER' && newPatternBarrier === 0) {
            toast.error("Para apostar 'Abaixo', a barreira não pode ser 0.");
            return;
        }

        const newProfiles = {
            ...overUnderPatternProfiles,
            [newPatternName]: {
                sequence: newPatternSequence,
                tradeType: newPatternTradeType,
                barrier: newPatternBarrier, // <-- Save barrier
                isActive: false // Começa desativado por padrão
            }
        };
        setOverUnderPatternProfiles(newProfiles);
        toast.success(`Padrão "${newPatternName}" salvo com sucesso!`);
        setNewPatternName('');
        setNewPatternSequence('');
    };

    const handleToggleActivation = (name: string, isActive: boolean) => {
        const updatedProfiles = { ...overUnderPatternProfiles };
        if (updatedProfiles[name]) {
            updatedProfiles[name].isActive = isActive;
            setOverUnderPatternProfiles(updatedProfiles);
            toast.info(`Padrão "${name}" ${isActive ? 'ativado' : 'desativado'}.`);
        }
    };

    const handleDeletePattern = (name: string) => {
        const newProfiles = { ...overUnderPatternProfiles };
        delete newProfiles[name];
        setOverUnderPatternProfiles(newProfiles);
        toast.info(`Padrão "${name}" excluído.`);
    };

    return (
        <>
            <div className="pl-4 border-l-2 border-primary/50 space-y-4 pt-4 mt-4">
                <h4 className="font-medium text-sm">Criar Novo Padrão (Acima/Abaixo)</h4>
                
                <div className="space-y-2">
                    <Label htmlFor="pattern-name-ou">Nome do Padrão</Label>
                    <Input id="pattern-name-ou" value={newPatternName} onChange={(e) => setNewPatternName(e.target.value)} placeholder="Ex: Sequência de Alta" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Label>Sequência (A/B)</Label>
                        <InfoTooltip infoText="Clique nos botões para montar a sequência de Acima (A) ou Abaixo (B) que o bot deve esperar antes de entrar. A/B é definido pelo Dígito Alvo (Barreira) abaixo." />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted min-h-[40px] flex-wrap">
                        {newPatternSequence.split('').map((char, index) => (
                            <Badge key={index} className={cn('text-lg font-bold', char === 'A' ? 'bg-green-500/80' : 'bg-blue-500/80')}>{char}</Badge>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button variant="outline" onClick={() => handleAddDigit('A')}><PlusCircle className="h-4 w-4 mr-2" />Acima (A)</Button>
                    <Button variant="outline" onClick={() => handleAddDigit('B')}><PlusCircle className="h-4 w-4 mr-2" />Abaixo (B)</Button>
                    <Button variant="ghost" onClick={handleRemoveLast}><Delete className="h-4 w-4 mr-2" />Apagar</Button>
                    <Button variant="destructive" onClick={handleClear}><Trash2 className="h-4 w-4 mr-2" />Limpar</Button>
                </div>
                
                {/* NEW: Barrier Setting */}
                <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="newPatternBarrier">Dígito Alvo (Barreira)</Label>
                            <InfoTooltip infoText="O dígito que define o que é 'Acima' (A) e 'Abaixo' (B) para esta sequência." />
                        </div>
                        <span className="font-bold text-primary">{newPatternBarrier}</span>
                    </div>
                    <Slider
                        id="newPatternBarrier"
                        value={[newPatternBarrier]}
                        onValueChange={(val) => setNewPatternBarrier(val[0])}
                        min={0}
                        max={9}
                        step={1}
                    />
                </div>
                {/* END NEW: Barrier Setting */}

                <div className="space-y-2">
                    <Label htmlFor="newPatternTradeTypeOU">Aposta Após Sequência</Label>
                    <Select value={newPatternTradeType} onValueChange={(v) => setNewPatternTradeType(v as 'DIGITOVER' | 'DIGITUNDER')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DIGITOVER">Acima (A)</SelectItem>
                            <SelectItem value="DIGITUNDER">Abaixo (B)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-end pt-4 border-t mt-4">
                    <Button onClick={handleSavePattern}>
                        <Save className="h-4 w-4 mr-2" />Salvar Novo Padrão
                    </Button>
                </div>

                <div className="space-y-3 pt-4">
                    <h4 className="font-medium text-sm">Gerenciador de Padrões (A/B)</h4>
                    {Object.keys(overUnderPatternProfiles).length > 0 ? (
                        Object.entries(overUnderPatternProfiles).map(([name, profile]: [string, any]) => (
                            <div key={name} className={cn("p-3 rounded-lg border transition-all", profile.isActive ? "border-primary bg-primary/10" : "bg-muted/50")}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h5 className="font-semibold">{name}</h5>
                                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                                            {profile.sequence.split('').map((char: string, index: number) => (
                                                <Badge key={index} className={cn('font-bold', char === 'A' ? 'bg-green-500/80' : 'bg-blue-500/80')}>{char}</Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Aposta em: <span className="font-semibold">{profile.tradeType === 'DIGITOVER' ? 'Acima' : 'Abaixo'}</span>
                                            {profile.barrier !== undefined && ` (Barreira: ${profile.barrier})`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4">
                                        <Switch
                                            checked={profile.isActive}
                                            onCheckedChange={(checked) => handleToggleActivation(name, checked)}
                                            aria-label={`Ativar padrão ${name}`}
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeletePattern(name)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum padrão salvo ainda.</p>
                    )}
                </div>
            </div>
        </>
    );
};