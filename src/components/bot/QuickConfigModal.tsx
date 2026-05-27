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
import { DollarSign, Target, Play, Zap } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';

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
        setIsSmartModeActive
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss]);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        setStopLoss(tempStop);
        setIsSmartModeActive(true); // Reativa a decisão autônoma da I.A
        onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] glass-panel border-none p-8 sm:p-10">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit">
                        <Zap className="h-6 w-6 text-primary fill-current" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Protocolo de Partida</DialogTitle>
                    <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Gestão de Sessão</p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
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

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] font-bold text-primary text-center uppercase tracking-widest leading-relaxed">
                            A I.A assumirá o controle total dos filtros de segurança e direção após a decolagem.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};