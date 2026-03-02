"use client";

import React, { useState } from 'react';
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
import { DollarSign, Target, Play } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';

interface QuickConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const QuickConfigModal: React.FC<QuickConfigModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { initialStake, setInitialStake, takeProfit, setTakeProfit } = useBotContext();
    
    // Estados locais para evitar salvar no contexto antes de confirmar (opcional, mas mais limpo)
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);

    const handleConfirm = () => {
        setInitialStake(tempStake);
        setTakeProfit(tempMeta);
        onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] glass-panel border-none p-8">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Configuração de Voo</DialogTitle>
                    <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Defina seus limites antes de decolar</p>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                    <div className="space-y-3">
                        <Label htmlFor="q-stake" className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Valor da Entrada (USD)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                                id="q-stake"
                                value={tempStake}
                                onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                className="pl-10 h-12 rounded-2xl font-black text-lg border-2 focus:border-primary/50"
                                placeholder="0.35"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="q-meta" className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Meta de Lucro (USD)</Label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                            <Input 
                                id="q-meta"
                                value={tempMeta}
                                onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                className="pl-10 h-12 rounded-2xl font-black text-lg border-2 focus:border-primary/50"
                                placeholder="10.00"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20"
                    >
                        <Play className="h-5 w-5 mr-2 fill-current" /> CONFIRMAR E INICIAR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};