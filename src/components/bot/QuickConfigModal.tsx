"use client";

import React, { useState, useEffect } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ShieldCheck, Play, Zap, BrainCircuit } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';

interface QuickConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const QuickConfigModal: React.FC<QuickConfigModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { 
        setInitialStake, 
        setTakeProfit, 
        setStopLoss,
        setIsSmartModeActive,
        setIsMartingaleActive,
        setMaxLevels,
        setMartingaleFactor,
        setIsSorosActive,
        setSorosLevels,
        setSorosProfitPercentage,
        setDigitTradeMode
    } = useBotContext();
    
    const [bankroll, setBankroll] = useState('100.00');

    const handleConfirm = () => {
        const bankrollValue = parseFloat(bankroll) || 100;
        
        // --- CONFIGURAÇÃO AUTOMÁTICA INTELIGENTE (Foco em Alta Lucratividade e Proteção) ---
        // 1. Stake Inicial: 1% da banca (mínimo de $0.35 para segurança matemática)
        const calculatedStake = Math.max(0.35, bankrollValue * 0.01);
        setInitialStake(calculatedStake.toFixed(2));

        // 2. Meta Diária (Take Profit): 5% da banca (altamente alcançável e consistente)
        const calculatedMeta = bankrollValue * 0.05;
        setTakeProfit(calculatedMeta.toFixed(2));

        // 3. Limite de Perda (Stop Loss): 15% da banca (protege 85% do seu capital em dias ruins)
        const calculatedStop = bankrollValue * 0.15;
        setStopLoss(calculatedStop.toFixed(2));

        // 4. Ativa Martingale Inteligente (Recuperação rápida)
        setIsMartingaleActive(true);
        setMaxLevels(4); // Máximo de 4 gales para não quebrar a banca
        setMartingaleFactor('2.2');

        // 5. Ativa Soros Automático (Alavancagem exponencial sem risco adicional)
        setIsSorosActive(true);
        setSorosLevels(2); // Ciclos de 2 níveis para maximizar lucros nas sequências vitoriosas
        setSorosProfitPercentage(50); // Reinveste 50% do lucro da vitória anterior

        // 6. Ativa Modo Multimodal (A I.A decide em tempo real a melhor modalidade)
        setDigitTradeMode('multimodal');
        setIsSmartModeActive(true);

        onConfirm();
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 text-white pb-8 px-4 rounded-t-[2.5rem]">
                {/* Indicador de arrastar do Drawer */}
                <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full my-4" />
                
                <DrawerHeader className="space-y-2 p-0">
                    <div className="mx-auto bg-cyan-500/10 p-2.5 rounded-xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <BrainCircuit className="h-5 w-5 text-cyan-400 animate-pulse" />
                    </div>
                    <DrawerTitle className="text-xl font-black uppercase tracking-tighter text-center text-white">
                        Configuração Automática I.A
                    </DrawerTitle>
                    <p className="text-center text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        Gestão de Banca e Proteção
                    </p>
                </DrawerHeader>
                
                <div className="space-y-4 py-4 max-w-md mx-auto w-full">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                            Qual o valor total da sua banca? ($)
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400" />
                            <Input 
                                value={bankroll}
                                onChange={(e) => setBankroll(e.target.value.replace(',', '.'))}
                                className="pl-10 h-14 rounded-2xl font-black text-xl bg-slate-900/60 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 text-center"
                                placeholder="100.00"
                            />
                        </div>
                    </div>

                    {/* Painel de Configurações que a I.A vai aplicar */}
                    <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 space-y-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                                Protocolo de Proteção Ativado:
                            </span>
                        </div>
                        <ul className="space-y-1.5 text-[10px] text-slate-300 font-medium">
                            <li className="flex justify-between">
                                <span>• Entrada Inicial (1%):</span>
                                <span className="font-bold text-white">${(parseFloat(bankroll) * 0.01 || 1).toFixed(2)}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>• Meta Diária (5%):</span>
                                <span className="font-bold text-emerald-400">${(parseFloat(bankroll) * 0.05 || 5).toFixed(2)}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>• Stop Loss Seguro (15%):</span>
                                <span className="font-bold text-rose-400">${(parseFloat(bankroll) * 0.15 || 15).toFixed(2)}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>• Alavancagem Soros:</span>
                                <span className="font-bold text-cyan-400">Ativado (Nível 2)</span>
                            </li>
                            <li className="flex justify-between">
                                <span>• Recuperação Martingale:</span>
                                <span className="font-bold text-cyan-400">Ativado (Máx 4)</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <DrawerFooter className="p-0 max-w-md mx-auto w-full mt-2">
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300"
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" /> ATIVAR PILOTO AUTOMÁTICO
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};