"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Target, Play, ShieldAlert, Zap, AlertTriangle, ListOrdered, ArrowRightLeft, BrainCircuit, Sparkles } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

interface QuickConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const QuickConfigModal: React.FC<QuickConfigModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { 
        initialStake, setInitialStake, 
        takeProfit, setTakeProfit,
        stopLoss, setStopLoss,
        virtualTargetLosses, setVirtualTargetLosses,
        consecutiveTarget, setConsecutiveTarget,
        entryDirection, setEntryDirection,
        isHybridModeActive, setIsHybridModeActive,
        hybridWinsRequired, setHybridWinsRequired,
        isSmartModeActive, setIsSmartModeActive
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [virtualActive, setVirtualActive] = useState(virtualTargetLosses > 0);
    const [tempVirtualLoss, setTempVirtualLoss] = useState(virtualTargetLosses || 1);
    const [tempConsecutive, setTempConsecutive] = useState(consecutiveTarget);
    const [tempDirection, setTempDirection] = useState(entryDirection);
    const [tempHybridActive, setTempHybridActive] = useState(isHybridModeActive);
    const [tempHybridWins, setTempHybridWins] = useState(hybridWinsRequired);
    const [tempSmartActive, setTempSmartActive] = useState(isSmartModeActive);

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setVirtualActive(virtualTargetLosses > 0);
            setTempVirtualLoss(virtualTargetLosses || 1);
            setTempConsecutive(consecutiveTarget);
            setTempDirection(entryDirection);
            setTempHybridActive(isHybridModeActive);
            setTempHybridWins(hybridWinsRequired);
            setTempSmartActive(isSmartModeActive);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, virtualTargetLosses, consecutiveTarget, entryDirection, isHybridModeActive, hybridWinsRequired, isSmartModeActive]);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        setStopLoss(tempStop);
        setVirtualTargetLosses(virtualActive ? tempVirtualLoss : 0);
        setConsecutiveTarget(tempConsecutive);
        setEntryDirection(tempDirection);
        setIsHybridModeActive(tempHybridActive);
        setHybridWinsRequired(tempHybridWins);
        setIsSmartModeActive(tempSmartActive);
        onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] glass-panel border-none p-8 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto bg-blue-500/10 p-3 rounded-2xl w-fit">
                        <Zap className="h-6 w-6 text-blue-600 fill-current" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Protocolo de Partida</DialogTitle>
                    <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Configure a inteligência de operação</p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                    {/* MODO SMART NEURAL - DESTAQUE */}
                    <div className={cn(
                        "p-5 rounded-3xl border-2 transition-all duration-500 space-y-4 relative overflow-hidden",
                        tempSmartActive ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "bg-gray-50 border-transparent"
                    )}>
                        {tempSmartActive && <div className="absolute top-0 right-0 p-2"><Sparkles className="h-4 w-4 text-blue-500 animate-pulse" /></div>}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl", tempSmartActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400")}>
                                    <BrainCircuit className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-black uppercase tracking-tight">Modo Smart Neural</Label>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">A I.A decide tudo sozinha</p>
                                </div>
                            </div>
                            <Switch 
                                checked={tempSmartActive} 
                                onCheckedChange={setTempSmartActive} 
                            />
                        </div>
                        {tempSmartActive && (
                            <p className="text-[9px] font-bold text-blue-600/80 italic animate-in fade-in slide-in-from-top-1">
                                * Otimização dinâmica de ciclos e direção ativada.
                            </p>
                        )}
                    </div>

                    {/* Configuração de Sequência - Esconde se Smart estiver ativo */}
                    {!tempSmartActive && (
                        <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-2 mb-2">
                                <ListOrdered className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Configuração Manual</span>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Esperar quantos seguidos?</Label>
                                <Input 
                                    type="number"
                                    value={tempConsecutive}
                                    onChange={(e) => setTempConsecutive(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="10"
                                    className="h-11 rounded-xl font-black text-center bg-white border-none shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Direção da Entrada</Label>
                                <Select value={tempDirection} onValueChange={(v: any) => setTempDirection(v)}>
                                    <SelectTrigger className="h-11 rounded-xl font-bold bg-white border-none shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AGAINST">Contra a Sequência (Reversão)</SelectItem>
                                        <SelectItem value="FAVOR">A Favor da Sequência (Tendência)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* VITÓRIA VIRTUAL (ANTIGO MODO HÍBRIDO) */}
                    <div className={cn(
                        "p-5 rounded-3xl border-2 transition-all duration-500 space-y-4",
                        tempHybridActive ? "bg-green-500/5 border-green-500/20" : "bg-gray-50 border-transparent"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className={cn("h-4 w-4", tempHybridActive ? "text-green-600" : "text-gray-400")} />
                                <div className="space-y-0.5">
                                    <Label className="text-[10px] font-black uppercase tracking-tight">Vitória Virtual (Demo → Real)</Label>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Aguardar vitórias simuladas antes da Real</p>
                                </div>
                            </div>
                            <Switch 
                                checked={tempHybridActive} 
                                onCheckedChange={setTempHybridActive} 
                            />
                        </div>

                        {tempHybridActive && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-[10px] font-bold text-green-600 whitespace-nowrap">Quantas vitórias esperar?</Label>
                                <Input 
                                    type="number"
                                    value={tempHybridWins}
                                    onChange={(e) => setTempHybridWins(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="10"
                                    className="h-9 rounded-xl font-black text-center border-green-200 bg-white"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Entrada ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                                <Input 
                                    value={tempStake}
                                    onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                    className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Meta ($)</Label>
                            <div className="relative">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
                                <Input 
                                    value={tempMeta}
                                    onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                    className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Stop Loss ($)</Label>
                        <div className="relative">
                            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500" />
                            <Input 
                                value={tempStop}
                                onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none"
                            />
                        </div>
                    </div>

                    <div className={cn(
                        "p-4 rounded-2xl border-2 transition-all duration-500 space-y-4",
                        virtualActive ? "bg-blue-500/5 border-blue-500/20" : "bg-gray-50 border-transparent"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className={cn("h-4 w-4", virtualActive ? "text-blue-500" : "text-gray-400")} />
                                <div className="space-y-0.5">
                                    <Label className="text-[10px] font-black uppercase tracking-tight">Filtro de Loss Virtual</Label>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Aguardar erros simulados</p>
                                </div>
                            </div>
                            <Switch 
                                checked={virtualActive} 
                                onCheckedChange={setVirtualActive} 
                            />
                        </div>

                        {virtualActive && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-[10px] font-bold text-blue-600 whitespace-nowrap">Quantos Losses?</Label>
                                <Input 
                                    type="number"
                                    value={tempVirtualLoss}
                                    onChange={(e) => setTempVirtualLoss(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="10"
                                    className="h-9 rounded-xl font-black text-center border-blue-200 bg-white"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-[0.2em] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};