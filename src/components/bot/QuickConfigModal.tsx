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
import { DollarSign, ShieldCheck, Play, BrainCircuit, AlertTriangle } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { toast } from "sonner";

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
        setDigitTradeMode
    } = useBotContext();
    
    const [bankroll, setBankroll] = useState('100.00');
    const [customStake, setCustomStake] = useState('1.00');
    const [customMeta, setCustomMeta] = useState('5.00');
    const [customStop, setCustomStop] = useState('15.00');

    // Atualiza as sugestões automaticamente quando a banca é alterada
    useEffect(() => {
        const bankrollValue = parseFloat(bankroll) || 100;
        
        // Entrada Inicial: 1% da banca (mínimo de $0.35)
        const calculatedStake = Math.max(0.35, bankrollValue * 0.01);
        setCustomStake(calculatedStake.toFixed(2));

        // Meta Diária (Take Profit): 5% da banca
        const calculatedMeta = bankrollValue * 0.05;
        setCustomMeta(calculatedMeta.toFixed(2));

        // Limite de Perda (Stop Loss): 15% da banca
        const calculatedStop = bankrollValue * 0.15;
        setCustomStop(calculatedStop.toFixed(2));
    }, [bankroll]);

    const handleConfirm = () => {
        const stakeValue = parseFloat(customStake) || 0.35;
        const metaValue = parseFloat(customMeta) || 5.00;
        const stopValue = parseFloat(customStop) || 15.00;

        // Aplica e salva as configurações personalizadas do usuário no contexto global (que já possui persistência)
        setInitialStake(stakeValue.toFixed(2));
        setTakeProfit(metaValue.toFixed(2));
        setStopLoss(stopValue.toFixed(2));

        // Ativa Martingale Inteligente (Recuperação rápida)
        setIsMartingaleActive(true);
        
        const factor = 2.2;
        setMartingaleFactor(factor.toFixed(1));

        // CALCULA DINAMICAMENTE OS NÍVEIS MÁXIMOS COM BASE NO STOP LOSS
        let totalLoss = 0;
        let currentStake = stakeValue;
        let levels = 0;
        while (totalLoss + currentStake <= stopValue && levels < 10) {
            totalLoss += currentStake;
            currentStake = currentStake * factor;
            levels++;
        }
        const calculatedLevels = Math.max(2, levels);
        setMaxLevels(calculatedLevels);

        // DESATIVA Soros Automático conforme solicitado
        setIsSorosActive(false);

        // Ativa Modo Multimodal (A I.A decide em tempo real a melhor modalidade)
        setDigitTradeMode('multimodal');
        setIsSmartModeActive(true);

        // Salva no localStorage para garantir persistência imediata e robusta
        localStorage.setItem('bot_initial_stake', stakeValue.toFixed(2));
        localStorage.setItem('bot_take_profit', metaValue.toFixed(2));
        localStorage.setItem('bot_stop_loss', stopValue.toFixed(2));
        localStorage.setItem('bot_is_martingale_active', 'true');
        localStorage.setItem('bot_martingale_factor', factor.toFixed(1));
        localStorage.setItem('bot_max_levels', String(calculatedLevels));
        localStorage.setItem('bot_is_soros_active', 'false');
        localStorage.setItem('bot_digit_trade_mode', 'multimodal');
        localStorage.setItem('bot_is_smart_mode_active', 'true');

        toast.success("Configurações salvas e aplicadas com sucesso!");
        onConfirm();
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 text-white pb-8 px-4 rounded-t-[2.5rem] max-h-[94vh] overflow-y-auto">
                {/* Indicador de arrastar do Drawer */}
                <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full my-4 shrink-0" />
                
                <DrawerHeader className="space-y-2 p-0 shrink-0">
                    <div className="mx-auto bg-cyan-500/10 p-2.5 rounded-xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <BrainCircuit className="h-5 w-5 text-cyan-400 animate-pulse" />
                    </div>
                    <DrawerTitle className="text-xl font-black uppercase tracking-tighter text-center text-white">
                        Configuração Personalizada I.A
                    </DrawerTitle>
                    <p className="text-center text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        Gestão de Banca e Proteção
                    </p>
                </DrawerHeader>
                
                <div className="space-y-4 py-4 max-w-md mx-auto w-full overflow-y-auto px-1">
                    {/* Input de Banca */}
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">
                            Qual o valor total da sua banca? ($)
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400" />
                            <Input 
                                value={bankroll}
                                onChange={(e) => setBankroll(e.target.value.replace(',', '.'))}
                                inputMode="decimal"
                                className="pl-10 h-12 rounded-2xl font-black text-lg bg-slate-900/60 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 text-center"
                                placeholder="100.00"
                            />
                        </div>
                    </div>

                    {/* Painel de Ajustes Finos */}
                    <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                            <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                                Ajuste os Limites Recomendados:
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {/* Entrada */}
                            <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase text-slate-400">Entrada ($)</Label>
                                <Input 
                                    value={customStake}
                                    onChange={(e) => setCustomStake(e.target.value.replace(',', '.'))}
                                    inputMode="decimal"
                                    className="h-9 text-xs rounded-xl bg-slate-950/50 border-white/10 text-center font-bold"
                                />
                            </div>

                            {/* Meta */}
                            <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase text-emerald-400">Meta ($)</Label>
                                <Input 
                                    value={customMeta}
                                    onChange={(e) => setCustomMeta(e.target.value.replace(',', '.'))}
                                    inputMode="decimal"
                                    className="h-9 text-xs rounded-xl bg-slate-950/50 border-white/10 text-center font-bold text-emerald-400"
                                />
                            </div>

                            {/* Stop Loss */}
                            <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase text-rose-400">Stop ($)</Label>
                                <Input 
                                    value={customStop}
                                    onChange={(e) => setCustomStop(e.target.value.replace(',', '.'))}
                                    inputMode="decimal"
                                    className="h-9 text-xs rounded-xl bg-slate-950/50 border-white/10 text-center font-bold text-rose-400"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-medium pt-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                            <span>Soros desativado. Martingale inteligente ativo.</span>
                        </div>
                    </div>
                </div>

                <DrawerFooter className="p-0 max-w-md mx-auto w-full mt-2 shrink-0">
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300 active:scale-95"
                    >
                        <Play className="h-4 w-4 mr-2 fill-current" /> ATIVAR PILOTO AUTOMÁTICO
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};