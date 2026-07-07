"use client";

import React, { useState } from 'react';
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

export const ColorPatternConfig = () => {
    const {
        colorPatternProfiles, setColorPatternProfiles
    } = useBotContext();

    const [newPatternName, setNewPatternName] = useState('');
    const [newPatternSequence, setNewPatternSequence] = useState('');
    const [newPatternTradeType, setNewPatternTradeType] = useState<'DIGITODD' | 'DIGITEVEN'>('DIGITODD');

    const handleAddDigit = (digit: 'E' | 'O') => {
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
        if (colorPatternProfiles[newPatternName]) {
            toast.error("Já existe um padrão com este nome.");
            return;
        }
        const newProfiles = {
            ...colorPatternProfiles,
            [newPatternName]: {
                sequence: newPatternSequence,
                tradeType: newPatternTradeType,
                isActive: false // Começa desativado por padrão
            }
        };
        setColorPatternProfiles(newProfiles);
        toast.success(`Padrão "${newPatternName}" salvo com sucesso!`);
        setNewPatternName('');
        setNewPatternSequence('');
    };

    const handleToggleActivation = (name: string, isActive: boolean) => {
        const updatedProfiles = { ...colorPatternProfiles };
        if (updatedProfiles[name]) {
            updatedProfiles[name].isActive = isActive;
            setColorPatternProfiles(updatedProfiles);
            toast.info(`Padrão "${name}" ${isActive ? 'ativado' : 'desativado'}.`);
        }
    };

    const handleDeletePattern = (name: string) => {
        const newProfiles = { ...colorPatternProfiles };
        delete newProfiles[name];
        setColorPatternProfiles(newProfiles);
        toast.info(`Padrão "${name}" excluído.`);
    };

    return (
        <>
            <div className="pl-4 border-l-2 border-primary/50 space-y-4 pt-4 mt-4">
                <h4 className="font-medium text-sm">Criar Novo Padrão</h4>
                
                <div className="space-y-2">
                    <Label htmlFor="pattern-name">Nome do Padrão</Label>
                    <Input id="pattern-name" value={newPatternName} onChange={(e) => setNewPatternName(e.target.value)} placeholder="Ex: Final 2 Ímpar" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Label>Sequência de Cores</Label>
                        <InfoTooltip infoText="Clique nos botões para montar a sequência de Par (E) ou Ímpar (O) que o bot deve esperar antes de entrar." />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted min-h-[40px] flex-wrap">
                        {newPatternSequence.split('').map((char, index) => (
                            <Badge key={index} className={cn('text-lg font-bold', char === 'E' ? 'bg-green-500/80' : 'bg-red-500/80')}>
                                {char}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button variant="outline" onClick={() => handleAddDigit('E')}><PlusCircle className="h-4 w-4 mr-2" />Par (E)</Button>
                    <Button variant="outline" onClick={() => handleAddDigit('O')}><PlusCircle className="h-4 w-4 mr-2" />Ímpar (O)</Button>
                    <Button variant="ghost" onClick={handleRemoveLast}><Delete className="h-4 w-4 mr-2" />Apagar</Button>
                    <Button variant="destructive" onClick={handleClear}><Trash2 className="h-4 w-4 mr-2" />Limpar</Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="newPatternTradeType">Aposta Após Sequência</Label>
                    <Select value={newPatternTradeType} onValueChange={(v) => setNewPatternTradeType(v as 'DIGITODD' | 'DIGITEVEN')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DIGITODD">Ímpar (O)</SelectItem>
                            <SelectItem value="DIGITEVEN">Par (E)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-end pt-4 border-t mt-4">
                    <Button onClick={handleSavePattern}>
                        <Save className="h-4 w-4 mr-2" />Salvar Novo Padrão
                    </Button>
                </div>

                <div className="space-y-3 pt-4">
                    <h4 className="font-medium text-sm">Gerenciador de Padrões</h4>
                    {Object.keys(colorPatternProfiles).length > 0 ? (
                        Object.entries(colorPatternProfiles).map(([name, profile]: [string, any]) => (
                            <div key={name} className={cn("p-3 rounded-lg border transition-all", profile.isActive ? "border-primary bg-primary/10" : "bg-muted/50")}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h5 className="font-semibold">{name}</h5>
                                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                                            {profile.sequence.split('').map((char: string, index: number) => (
                                                <Badge key={index} className={cn('font-bold', char === 'E' ? 'bg-green-500/80' : 'bg-red-500/80')}>{char}</Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Aposta em: <span className="font-semibold">{profile.tradeType === 'DIGITODD' ? 'Ímpar' : 'Par'}</span></p>
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