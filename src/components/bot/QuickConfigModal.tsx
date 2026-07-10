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
import { DollarSign, Target, Play, Zap, ShieldAlert, TrendingUp, Shield, Timer, X } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABLE_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'R_10', label: 'Volatility 10 Index' },
    { value: 'R_25', label: 'Volatility 25 Index' },
    { value: 'R_50', label: 'Volatility 50 Index' },
    { value: 'R_75', label: 'Volatility 75 Index' },
    { value: 'R_100', label: 'Volatility 100 Index' },
];


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
        asset, setAsset,
        isConnected
    } = useBotContext();
    
    const [tempStake, setTempStake] = useState(initialStake);
    const [tempMeta, setTempMeta] = useState(takeProfit);
    const [tempStop, setTempStop] = useState(stopLoss);
    const [tempFactor, setTempFactor] = useState(martingaleFactor || "2.1");
    const [tempLevels, setTempLevels] = useState<string | number>(maxLevels || 2);
    const [tempMartingaleActive, setTempMartingaleActive] = useState(isMartingaleActive !== false);
    const [tempSorosActive, setTempSorosActive] = useState(isSorosActive || false);
    const [tempSorosLevels, setTempSorosLevels] = useState<string | number>(sorosLevels || 3);
    const [tempDuration, setTempDuration] = useState<string | number>(duration || 3);
    const [tempAsset, setTempAsset] = useState<string>(asset || '1HZ10V');

    // Estados para o Filtro de Loss Virtual
    const [tempVirtualLossActive, setTempVirtualLossActive] = useState(true);
    const [tempVirtualLossMode, setTempVirtualLossMode] = useState<'auto' | 'manual'>('auto');
    const [tempVirtualLosses, setTempVirtualLosses] = useState<string | number>(virtualTargetLosses || 1);

    useEffect(() => {
        if (isOpen) {
            setTempStake(initialStake);
            setTempAsset(asset || '1HZ10V');
            setTempMeta(takeProfit);
            setTempStop(stopLoss);
            setTempFactor(martingaleFactor || "2.1");
            setTempLevels(maxLevels || 2);
            setTempMartingaleActive(isMartingaleActive !== false);
            setTempSorosActive(isSorosActive || false);
            setTempSorosLevels(sorosLevels || 3);
            setTempDuration(duration || 3);

            // Sincroniza estados do Loss Virtual
            const isVirtualActive = isSmartModeActive || virtualTargetLosses > 0;
            setTempVirtualLossActive(isVirtualActive);
            setTempVirtualLossMode(isSmartModeActive ? 'auto' : 'manual');
            setTempVirtualLosses(virtualTargetLosses > 0 ? virtualTargetLosses : 1);
        }
    }, [isOpen, initialStake, takeProfit, stopLoss, martingaleFactor, maxLevels, isMartingaleActive, isSorosActive, sorosLevels, duration, isSmartModeActive, virtualTargetLosses]);

    const handleConfirm = () => {
        try {
            // Tratamento de valores vazios para evitar bugs
            const finalStake = tempStake.trim() === "" ? "0.35" : tempStake;
            const finalMeta = tempMeta.trim() === "" ? "2.00" : tempMeta;
            const finalStop = tempStop.trim() === "" ? "10.00" : tempStop;
            const finalFactor = tempFactor.trim() === "" ? "2.1" : tempFactor;
            
            const finalLevels = tempLevels === "" ? 2 : Math.max(1, Number(tempLevels));
            const finalSorosLevels = tempSorosLevels === "" ? 3 : Math.max(1, Number(tempSorosLevels));
            const finalDuration = tempDuration === "" ? 3 : Math.max(1, Math.min(10, Number(tempDuration)));

            if (typeof setInitialStake === 'function') setInitialStake(finalStake);
            if (typeof setTakeProfit === 'function') setTakeProfit(finalMeta);
            if (typeof setStopLoss === 'function') setStopLoss(finalStop);
            if (typeof setMartingaleFactor === 'function') setMartingaleFactor(finalFactor);
            if (typeof setMaxLevels === 'function') setMaxLevels(finalLevels);
            if (typeof setIsMartingaleActive === 'function') setIsMartingaleActive(tempMartingaleActive);
            if (typeof setIsSorosActive === 'function') setIsSorosActive(tempSorosActive);
            if (typeof setSorosLevels === 'function') setSorosLevels(finalSorosLevels);
            if (typeof setDuration === 'function') setDuration(finalDuration);
            if (typeof setAsset === 'function') setAsset(tempAsset);

            // Salva configurações do Loss Virtual com segurança
            if (!tempVirtualLossActive) {
                if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(false);
                if (typeof setVirtualTargetLosses === 'function') setVirtualTargetLosses(0);
            } else {
                if (tempVirtualLossMode === 'auto') {
                    if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(true);
                    if (typeof setVirtualTargetLosses === 'function') setVirtualTargetLosses(1);
                } else {
                    if (typeof setIsSmartModeActive === 'function') setIsSmartModeActive(false);
                    const finalVirtualLosses = tempVirtualLosses === "" ? 1 : Math.max(1, Number(tempVirtualLosses));
                    if (typeof setVirtualTargetLosses === 'function') setVirtualTargetLosses(finalVirtualLosses);
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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-slate-950/98 backdrop-blur-2xl border border-white/10 text-white px-4 rounded-2xl max-w-md w-[92vw] max-h-[90vh] flex flex-col pb-5 overflow-hidden">
                <DialogHeader className="space-y-1 p-0 shrink-0 mb-2">
                    <div className="mx-auto bg-cyan-500/10 p-2 rounded-xl w-fit border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Zap className="h-4 w-4 text-cyan-400 fill-cyan-400/20" />
                    </div>
                    <DialogTitle className="text-lg font-black uppercase tracking-tighter text-center text-white">
                        Protocolo de Partida
                    </DialogTitle>
                    <p className="text-center text-[8px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        Gestão de Sessão Profissional
                    </p>
                </DialogHeader>
                
                {/* Área de conteúdo rolável */}
                <div className="flex-1 overflow-y-auto space-y-3.5 py-1 w-full pr-1 custom-scrollbar">
                    
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
                            <Zap className="h-3 w-3 text-cyan-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ativo Operacional</span>
                        </div>
                        <Select value={tempAsset} onValueChange={setTempAsset}>
                            <SelectTrigger className="w-full h-9 bg-slate-900/40 border-white/10 text-white font-bold">
                                <SelectValue placeholder="Selecione o Ativo" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/10 text-white">
                                {AVAILABLE_ASSETS.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
                                <div className="relative flex items-center">
                                    <DollarSign className="absolute left-2.5 h-3 w-3 text-cyan-400 z-10" />
                                    <Input 
                                        value={tempStake}
                                        onChange={(e) => setTempStake(e.target.value.replace(',', '.'))}
                                        className="pl-7 pr-8 h-9 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 w-full"
                                        placeholder="0.35"
                                    />
                                    {tempStake !== "" && (
                                        <button 
                                            type="button"
                                            onClick={() => setTempStake("")}
                                            className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Meta ($)
                                </Label>
                                <div className="relative flex items-center">
                                    <Target className="absolute left-2.5 h-3 w-3 text-emerald-400 z-10" />
                                    <Input 
                                        value={tempMeta}
                                        onChange={(e) => setTempMeta(e.target.value.replace(',', '.'))}
                                        className="pl-7 pr-8 h-9 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 w-full"
                                        placeholder="2.00"
                                    />
                                    {tempMeta !== "" && (
                                        <button 
                                            type="button"
                                            onClick={() => setTempMeta("")}
                                            className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Stop Loss ($)
                                </Label>
                                <div className="relative flex items-center">
                                    <Target className="absolute left-2.5 h-3 w-3 text-rose-400 z-10" />
                                    <Input 
                                        value={tempStop}
                                        onChange={(e) => setTempStop(e.target.value.replace(',', '.'))}
                                        className="pl-7 pr-8 h-9 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50 w-full"
                                        placeholder="10.00"
                                    />
                                    {tempStop !== "" && (
                                        <button 
                                            type="button"
                                            onClick={() => setTempStop("")}
                                            className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Duração (Ticks)
                                </Label>
                                <div className="relative flex items-center">
                                    <Timer className="absolute left-2.5 h-3 w-3 text-amber-400 z-10" />
                                    <Input 
                                        type="number"
                                        value={tempDuration}
                                        onChange={(e) => setTempDuration(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="pl-7 pr-8 h-9 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50 w-full"
                                        placeholder="3"
                                        min="1"
                                        max="10"
                                    />
                                    {tempDuration !== "" && (
                                        <button 
                                            type="button"
                                            onClick={() => setTempDuration("")}
                                            className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
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
                                onCheckedChange={(checked) => setTempVirtualLossActive(checked)}
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
                                        <div className="relative flex items-center">
                                            <Input 
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={tempVirtualLosses}
                                                onChange={(e) => setTempVirtualLosses(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="h-9 pr-8 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 w-full"
                                                placeholder="1"
                                            />
                                            {tempVirtualLosses !== "" && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setTempVirtualLosses("")}
                                                    className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
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
                                onCheckedChange={(checked) => setTempMartingaleActive(checked)}
                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                            />
                        </div>

                        {tempMartingaleActive && (
                            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                        Multiplicador
                                    </Label>
                                    <div className="relative flex items-center">
                                        <Input 
                                            value={tempFactor}
                                            onChange={(e) => setTempFactor(e.target.value.replace(',', '.'))}
                                            className="h-9 pr-8 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50 w-full"
                                            placeholder="2.1"
                                        />
                                        {tempFactor !== "" && (
                                            <button 
                                                type="button"
                                                onClick={() => setTempFactor("")}
                                                className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                        Níveis Máximos
                                    </Label>
                                    <div className="relative flex items-center">
                                        <Input 
                                            type="number"
                                            value={tempLevels}
                                            onChange={(e) => setTempLevels(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="h-9 pr-8 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50 w-full"
                                            placeholder="2"
                                        />
                                        {tempLevels !== "" && (
                                            <button 
                                                type="button"
                                                onClick={() => setTempLevels("")}
                                                className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
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
                                onCheckedChange={(checked) => setTempSorosActive(checked)}
                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                            />
                        </div>

                        {tempSorosActive && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-[8px] font-black uppercase tracking-widest ml-1 text-slate-400">
                                    Níveis de Soros
                                </Label>
                                <div className="relative flex items-center">
                                    <Input 
                                        type="number"
                                        value={tempSorosLevels}
                                        onChange={(e) => setTempSorosLevels(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="h-9 pr-8 rounded-lg font-bold text-base bg-slate-900/40 border border-white/10 text-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 w-full"
                                        placeholder="3"
                                    />
                                    {tempSorosLevels !== "" && (
                                        <button 
                                            type="button"
                                            onClick={() => setTempSorosLevels("")}
                                            className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
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

                {/* Rodapé Fixo com o Botão de Decolar */}
                <DialogFooter className="p-0 w-full mt-3 shrink-0 pt-2 border-t border-white/5">
                    <Button 
                        onClick={handleConfirm}
                        className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-[0.2em] bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xl shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]"
                    >
                        <Play className="h-3 w-3 mr-1.5 fill-current" /> DECOLAR SISTEMA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};