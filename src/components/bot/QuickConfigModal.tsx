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
import { DollarSign, Target, Play, Zap, ListOrdered, BrainCircuit, Sparkles, ShieldCheck } from 'lucide-react';
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
        consecutiveTarget, setConsecutiveTarget,
        entryDirection, setEntryDirection,
        isSmartModeActive, setIsSmartModeActive
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [tempConsecutive, setTempConsecutive] = useState(consecutiveTarget);
    const [tempDirection, setTempDirection] = useState(entryDirection);
    const [tempSmartActive, setTempSmartActive] = useState(true); // Sempre ativo por padrão agora

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setTempConsecutive(consecutiveTarget);
            setTempDirection(entryDirection);
            setTempSmartActive(isSmartModeActive);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, consecutiveTarget, entryDirection, isSmartModeActive]);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        setStopLoss(tempStop);
        setConsecutiveTarget(tempConsecutive);
        setEntryDirection(tempDirection);
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
                    <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">O I.A Gerencia os filtros para você</p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                    <div className={cn(
                        "p-6 rounded-[2rem] border-2 transition-all duration-500 space-y-4 relative overflow-hidden",
                        tempSmartActive ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]" : "bg-gray-50 border-transparent"
                    )}>
                        {tempSmartActive && <div className="absolute top-0 right-0 p-3"><Sparkles className="h-5 w-5 text-blue-500 animate-pulse" /></div>}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-2xl shadow-lg", tempSmartActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400")}>
                                    <BrainCircuit className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-black uppercase tracking-tight">Filtro Inteligente Ativo</Label>
                                    <p className="text-[9px] font-bold text-blue-600/80 uppercase">Decisão Autônoma de Loss Virtual</p>
                                </div>
                            </div>
                            <Switch 
                                checked={tempSmartActive} 
                                onCheckedChange={setTempSmartActive} 
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-green-500/5 border border-green-500/20 flex items-center gap-4">
                        <div className="bg-green-500/10 p-2.5 rounded-xl">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-green-700 tracking-wider">Proteção de Capital Dinâmica</p>
                            <p className="text-[8px] text-green-600/70 font-bold uppercase">O Robô analisa o loss e decide quando entrar real</p>
                        </div>
                    </div>

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
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500" />
                            <Input 
                                value={tempStop}
                                onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none"
                            />
                        </div>
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