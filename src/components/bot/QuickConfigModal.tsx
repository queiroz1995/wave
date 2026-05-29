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
import { DollarSign, Target, Play, Zap, ShieldAlert } from 'lucide-react';
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
            <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] bg-white/95 backdrop-blur-2xl border border-slate-200 p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-900">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto bg-cyan-500/10 p-3.5 rounded-2xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Zap className="h-6 w-6 text-cyan-600 fill-cyan-500/20" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center text-slate-900">
                        Protocolo de Partida
                    </DialogTitle>
                    <p className="text-center text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em]">
                        Gestão de Sessão
                    </p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">
                                Entrada ($)
                            </Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-600" />
                                <Input 
                                    value={tempStake}
                                    onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                    className="pl-10 h-12 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-900 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">
                                Meta ($)
                            </Label>
                            <div className="relative">
                                <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                <Input 
                                    value={tempMeta}
                                    onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                    className="pl-10 h-12 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-900 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">
                            Stop Loss ($)
                        </Label>
                        <div className="relative">
                            <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-600" />
                            <Input 
                                value={tempStop}
                                onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                className="pl-10 h-12 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-900 focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider leading-relaxed">
                            A I.A assumirá o controle total dos filtros de segurança e direção após a decolagem.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02]"
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};