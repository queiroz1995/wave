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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Target, Play, Zap, ListOrdered, ShieldAlert } from 'lucide-react';
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
        entryDirection, setEntryDirection,
        setIsSmartModeActive
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [tempVirtual, setTempVirtual] = useState(virtualTargetLosses);
    const [tempDirection, setTempDirection] = useState(entryDirection);

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setTempVirtual(virtualTargetLosses);
            setTempDirection(entryDirection);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, virtualTargetLosses, entryDirection]);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        setStopLoss(tempStop);
        setVirtualTargetLosses(tempVirtual);
        setEntryDirection(tempDirection);
        setIsSmartModeActive(false); 
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
                    <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Configure sua estratégia de decolagem</p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                    <div className="p-6 rounded-[2rem] border-2 border-orange-500/20 bg-orange-500/5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <ShieldAlert className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-black uppercase tracking-tight">Filtro de Segurança</Label>
                                <p className="text-[9px] font-bold text-orange-600/80 uppercase">Quantos Loss Virtuais antes de entrar?</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4].map((num) => (
                                <Button
                                    key={num}
                                    variant={tempVirtual === num ? "default" : "outline"}
                                    onClick={() => setTempVirtual(num)}
                                    className={cn(
                                        "h-12 rounded-xl font-black text-base",
                                        tempVirtual === num ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-white border-none"
                                    )}
                                >
                                    {num}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ListOrdered className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Direção da Entrada</span>
                        </div>
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