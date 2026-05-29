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
            <DialogContent className="w-[92vw] max-w-[380px] rounded-[2rem] sm:rounded-[2.5rem] bg-slate-950/90 backdrop-blur-xl border border-white/10 p-5 sm:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] text-white gap-4">
                <DialogHeader className="space-y-2">
                    <div className="mx-auto bg-cyan-500/10 p-2.5 rounded-xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Zap className="h-5 w-5 text-cyan-400 fill-cyan-400/20" />
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-center text-white">
                        Protocolo de Partida
                    </DialogTitle>
                    <p className="text-center text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        Gestão de Sessão
                    </p>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                Entrada ($)
                            </Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400" />
                                <Input 
                                    value={tempStake}
                                    onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                    className="pl-8 h-10 rounded-xl font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                Meta ($)
                            </Label>
                            <div className="relative">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400" />
                                <Input 
                                    value={tempMeta}
                                    onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                    className="pl-8 h-10 rounded-xl font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">
                            Stop Loss ($)
                        </Label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-400" />
                            <Input 
                                value={tempStop}
                                onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                className="pl-8 h-10 rounded-xl font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50"
                            />
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-2.5">
                        <ShieldAlert className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider leading-relaxed">
                            A I.A assumirá o controle total dos filtros de segurança e direção após a decolagem.
                        </p>
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.02]"
                    >
                        <Play className="h-3.5 w-3.5 mr-2 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};