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
import { DollarSign, Target, Play, ShieldAlert, Zap, AlertTriangle } from 'lucide-react';
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
        virtualTargetLosses, setVirtualTargetLosses
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [virtualActive, setVirtualActive] = useState(virtualTargetLosses > 0);
    const [tempVirtualLoss, setTempVirtualLoss] = useState(virtualTargetLosses || 1);

    // Sincroniza com o estado global quando o modal abre
    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setVirtualActive(virtualTargetLosses > 0);
            setTempVirtualLoss(virtualTargetLosses || 1);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, virtualTargetLosses]);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        setStopLoss(tempStop);
        setVirtualTargetLosses(virtualActive ? tempVirtualLoss : 0);
        onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] glass-panel border-none p-8 sm:p-10">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto bg-blue-500/10 p-3 rounded-2xl w-fit">
                        <Zap className="h-6 w-6 text-blue-600 fill-current" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Protocolo de Partida</DialogTitle>
                    <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Configure os parâmetros da I.A WAVE</p>
                </DialogHeader>
                
                <div className="space-y-5 py-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Entrada ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                                <Input 
                                    value={tempStake}
                                    onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                    className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none focus-visible:ring-primary/20"
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
                                    className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none focus-visible:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Stop Loss (Máximo de Perda $)</Label>
                        <div className="relative">
                            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500" />
                            <Input 
                                value={tempStop}
                                onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                className="pl-9 h-11 rounded-xl font-bold text-sm bg-gray-50/50 border-none focus-visible:ring-primary/20"
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
                                <Label className="text-[10px] font-bold text-blue-600 whitespace-nowrap">Quanto Losses?</Label>
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