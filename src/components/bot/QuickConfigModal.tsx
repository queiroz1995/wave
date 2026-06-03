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
import { Switch } from "@/components/ui/switch";
import { DollarSign, Target, Play, Zap, ShieldAlert, TrendingUp, Shield, Timer } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

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
        isSmartModeActive, setIsSmartModeActive,
        virtualTargetLosses, setVirtualTargetLosses,
        martingaleFactor, setMartingaleFactor,
        maxLevels, setMaxLevels,
        isMartingaleActive, setIsMartingaleActive,
        isSorosActive, setIsSorosActive,
        sorosLevels, setSorosLevels,
        duration, setDuration,
        isConnected
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [tempFactor, setTempFactor] = useState(martingaleFactor || "2.1");
    const [tempLevels, setTempLevels] = useState(maxLevels || 2);
    const [tempMartingaleActive, setTempMartingaleActive] = useState(isMartingaleActive !== false);
    const [tempSorosActive, setTempSorosActive] = useState(isSorosActive || false);
    const [tempSorosLevels, setTempSorosLevels] = useState(sorosLevels || 3);
    const [tempDuration, setTempDuration] = useState(duration || 1);

    // Estados para o Filtro de Loss Virtual
    const [tempVirtualLossActive, setTempVirtualLossActive] = useState(true);
    const [tempVirtualLossMode, setTempVirtualLossMode] = useState<'auto' | 'manual'>('auto');
    const [tempVirtualLosses, setTempVirtualLosses] = useState(virtualTargetLosses || 1);

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setTempFactor(martingaleFactor || "2.1");
            setTempLevels(maxLevels || 2);
            setTempMartingaleActive(isMartingaleActive !== false);
            setTempSorosActive(isSorosActive || false);
            setTempSorosLevels(sorosLevels || 3);
            setTempDuration(duration || 1);

            // Sincroniza estados do Loss Virtual
            const isVirtualActive = isSmartModeActive || virtualTargetLosses > 0;
            setTempVirtualLossActive(isVirtualActive);
            setTempVirtualLossMode(isSmartModeActive ? 'auto' : 'manual');
            setTempVirtualLosses(virtualTargetLosses > 0 ? virtualTargetLosses : 1);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, martingaleFactor, maxLevels, isMartingaleActive, isSorosActive, sorosLevels, duration, isSmartModeActive, virtualTargetLosses]);

    const handleConfirm = () => {
        try {
            if (typeof setInitialStake === 'function') setInitialStake(tempStake);
            if (typeof setTakeProfit === 'function') setTakeProfit(tempMeta);
            if (typeof setStopLoss === 'function') setStopLoss(tempStop);
            if (typeof setMartingaleFactor === 'function') setMartingaleFactor(tempFactor);
            if (typeof setMaxLevels === 'function') setMaxLevels(Number(tempLevels) || 2);
            if (typeof setIsMartingaleActive === 'function') setIsMartingaleActive(tempMartingaleActive);
            if (typeof setIsSorosActive === 'function') setIsSorosActive(tempSorosActive);
            if (typeof setSorosLevels === 'function') setSorosLevels(Number(tempSorosLevels) || 3);
            if (typeof setDuration === 'function') setDuration(Number(tempDuration) || 1);

            // Salva configurações do Loss Virtual com segurança
            if (!tempVirtualLossActive) {
                if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(false);
                if (typeof setVirtualTargetLosses === 'function') setVirtualTargetLosses(0);
            } else {
                if (tempVirtualLossMode === 'auto') {
                    if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(true);
                } else {
                    if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(false);
                    if (typeof setVirtualTargetLosses === 'function') setVirtualTargetLosses(Number(tempVirtualLosses) || 1);
                }
            }

            if (!isConnected) {
                toast.info("Iniciando no Modo Simulação (Sem conexão com a Deriv).");
            }

            onConfirm();
        } catch (error) {
            console.error("Erro ao decolar sistema:", error);
            toast.error("Ocorreu um erro ao salvar as configurações.");
        }
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-slate-950/98 backdrop-blur-2xl border-t border-white/10 text-white pb-12 px-4 rounded-t-[2rem] max-h-[94vh] overflow-y-auto">
                {/* Indicador de arrastar do Drawer */}
                <div className="mx-auto w-10 h-1 bg-white/20 rounded-full my-3 shrink-0" />
                
                <DrawerHeader className="space-y-1 p-0 shrink-0">
                    <div className="mx-auto bg-cyan-500/10 p-2 rounded-xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Zap className="h-4 w-4 text-cyan-400 fill-cyan-400/20" />
                    </div>
                    <DrawerTitle className="text-lg font-black uppercase tracking-tighter text-center text-white">
                        Protocolo de Partida
                    </DrawerTitle>
                    <p className="text-center text-[8px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        Gestão de Sessão Profissional
                    </p>
                </DrawerHeader>
                
                <div className="space-y-3.5 py-3 max-w-md mx-auto w-full">
                    {/* Seção 1: Gestão de Banca */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
                            <Shield className="h-3 w-3 text-cyan-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gestão de Banca</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Entrada ($)
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-cyan-400" />
                                    <Input 
                                        value={tempStake}
                                        onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                        className="pl-7 h-9 rounded-lg font-bold text-sm bg-slate-900/40 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Meta ($)
                                </Label>
                                <div className="relative">
                                    <Target className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-emerald-400" />
                                    <Input 
                                        value={tempMeta}
                                        onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                        className="pl-7 h-9 rounded-lg font-bold text-sm bg-slate-900/40 border border-white/10 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Stop Loss ($)
                                </Label>
                                <div className="relative">
                                    <Target className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-rose-400" />
                                    <Input 
                                        value={tempStop}
                                        onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                        className="pl-7 h-9 rounded-lg font-bold text-sm bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Duração (Ticks)
                                </Label>
                                <div className="relative">
                                    <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-amber-400" />
                                    <Input 
                                        type="number"
                                        value={tempDuration}
                                        onChange={(e) => setTempDuration(Number(e.target.value))}
                                        className="pl-7 h-9 rounded-lg font-bold text-sm bg-slate-900/40 border border-white/10 text-white focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção: Filtro de Loss Virtual */}
                    <div className="space-y-2 bg-slate-900/20 p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1">
                            <div className="flex items-center gap-1.5">
                                <ShieldAlert className="h-3 w-3 text-cyan-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Filtro de Loss Virtual</span>
                            </div>
                            <Switch 
                                checked={tempVirtualLossActive} 
                                onCheckedChange={setTempVirtualLossActive}
                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                            />
                        </div>

                        {tempVirtualLossActive && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setTempVirtualLossMode('auto')}
                                        className={cn(
                                            "flex-1 h-7 text-[9px] font-bold uppercase rounded-lg border transition-all",
                                            tempVirtualLossMode === 'auto' 
                                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" 
                                                : "border-white/5 text-slate-400"
                                        )}
                                    >
                                        Automático (I.A)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setTempVirtualLossMode('manual')}
                                        className={cn(
                                            "flex-1 h-7 text-[9px] font-bold uppercase rounded-lg border transition-all",
                                            tempVirtualLossMode === 'manual' 
                                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" 
                                                : "border-white/5 text-slate-400"
                                        )}
                                    >
                                        Manual
                                    </Button>
                                </div>

                                {tempVirtualLossMode === 'manual' && (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                            Quantidade de Losses Virtuais
                                        </Label>
                                        <Input 
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={tempVirtualLosses}
                                            onChange={(e) => setTempVirtualLosses(Number(e.target.value))}
                                            className="h-9 rounded-lg font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Seção 2: Recuperação (Martingale) */}
                    <div className="space-y-2 bg-slate-900/20 p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1">
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3 text-rose-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recuperação Martingale</span>
                            </div>
                            <Switch 
                                checked={tempMartingaleActive} 
                                onCheckedChange={setTempMartingaleActive}
                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                            />
                        </div>

                        {tempMartingaleActive && (
                            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                        Multiplicador
                                    </Label>
                                    <Input 
                                        value={tempFactor}
                                        onChange={(e) => setTempFactor(e.target.value.replace(',', '.'))}
                                        className="h-9 rounded-lg font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                        Níveis Máximos
                                    </Label>
                                    <Input 
                                        type="number"
                                        value={tempLevels}
                                        onChange={(e) => setTempLevels(Number(e.target.value))}
                                        className="h-9 rounded-lg font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seção 3: Alavancagem (Soros) */}
                    <div className="space-y-2 bg-slate-900/20 p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-emerald-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Alavancagem Soros</span>
                            </div>
                            <Switch 
                                checked={tempSorosActive} 
                                onCheckedChange={setTempSorosActive}
                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                            />
                        </div>

                        {tempSorosActive && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Níveis de Soros
                                </Label>
                                <Input 
                                    type="number"
                                    value={tempSorosLevels}
                                    onChange={(e) => setTempSorosLevels(Number(e.target.value))}
                                    className="h-9 rounded-lg font-bold text-xs bg-slate-900/40 border border-white/10 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-[8px] font-bold text-cyan-300 uppercase tracking-wider leading-relaxed">
                            A I.A assumirá o controle total dos filtros de segurança e direção após a decolagem.
                        </p>
                    </div>
                </div>

                <DrawerFooter className="p-0 max-w-md mx-auto w-full mt-2 shrink-0 pb-6">
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]"
                    >
                        <Play className="h-3 w-3 mr-1.5 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};