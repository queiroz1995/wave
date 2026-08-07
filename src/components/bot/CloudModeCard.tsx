import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useBotContext } from '@/context/BotContext';
import { Cloud, Shield, Volume2, Cpu, Smartphone, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CloudModeCard = () => {
    const { cloudBackground, isBotRunning } = useBotContext();
    const [isHidden, setIsHidden] = useState<boolean>(() => {
        return localStorage.getItem('panel_hide_cloud_mode') === 'true';
    });

    const toggleHidden = (hidden: boolean) => {
        setIsHidden(hidden);
        localStorage.setItem('panel_hide_cloud_mode', String(hidden));
    };

    if (!cloudBackground) return null;

    const {
        isCloudModeEnabled,
        toggleCloudMode,
        isWakeLockActive,
        isAudioKeepAliveActive,
        isWorkerActive,
        wakeLockSupported
    } = cloudBackground;

    if (isHidden) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-cyan-500/20 rounded-xl backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2">
                    <Cloud className={cn("w-4 h-4", isCloudModeEnabled ? "text-cyan-400" : "text-slate-500")} />
                    <span className="text-xs font-semibold text-slate-300">Modo Nuvem</span>
                    {isCloudModeEnabled && (
                        <Badge variant="outline" className="text-[8px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 px-1 py-0">
                            ATIVO
                        </Badge>
                    )}
                </div>
                <button
                    onClick={() => toggleHidden(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Mostrar detalhes do Modo Nuvem"
                >
                    <EyeOff className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <Card className="p-4 bg-slate-900/60 border-cyan-500/20 backdrop-blur-md shadow-lg shadow-cyan-950/20 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "p-2 rounded-xl border transition-all duration-300",
                        isCloudModeEnabled && isBotRunning
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse"
                            : isCloudModeEnabled
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : "bg-slate-800 text-slate-500 border-white/5"
                    )}>
                        <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-wide">
                                Modo Nuvem & Segundo Plano
                            </h3>
                            {isCloudModeEnabled && (
                                <Badge variant="outline" className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold px-1.5 py-0">
                                    ATIVO
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Executa o robô com a tela bloqueada ou app minimizado
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleHidden(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Ocultar cartão"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <Switch
                        checked={isCloudModeEnabled}
                        onCheckedChange={(checked) => toggleCloudMode(checked)}
                        className="data-[state=checked]:bg-cyan-500"
                    />
                </div>
            </div>

            {/* Status dos Módulos de Execução em Segundo Plano */}
            <div className="grid grid-cols-3 gap-2">
                <div className={cn(
                    "p-2.5 rounded-lg border text-center transition-all",
                    isWakeLockActive 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
                        : "bg-slate-900/40 border-white/5 text-slate-500"
                )}>
                    <Shield className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[10px] font-bold block uppercase tracking-wider">WakeLock</span>
                    <span className="text-[9px] opacity-80 block mt-0.5">
                        {isWakeLockActive ? "Ativo (Tela)" : "Inativo"}
                    </span>
                </div>

                <div className={cn(
                    "p-2.5 rounded-lg border text-center transition-all",
                    isAudioKeepAliveActive 
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300" 
                        : "bg-slate-900/40 border-white/5 text-slate-500"
                )}>
                    <Volume2 className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[10px] font-bold block uppercase tracking-wider">Media Session</span>
                    <span className="text-[9px] opacity-80 block mt-0.5">
                        {isAudioKeepAliveActive ? "Ativo (Áudio)" : "Inativo"}
                    </span>
                </div>

                <div className={cn(
                    "p-2.5 rounded-lg border text-center transition-all",
                    isWorkerActive 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" 
                        : "bg-slate-900/40 border-white/5 text-slate-500"
                )}>
                    <Cpu className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[10px] font-bold block uppercase tracking-wider">Worker Thread</span>
                    <span className="text-[9px] opacity-80 block mt-0.5">
                        {isWorkerActive ? "Ativo (Heartbeat)" : "Inativo"}
                    </span>
                </div>
            </div>

            {/* Guia explicativo */}
            <div className="bg-slate-950/60 rounded-lg p-2.5 border border-white/5 text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                    <Smartphone className="w-3.5 h-3.5" />
                    Como funciona no Celular / Minimizado:
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Impede que o Android/iOS congele conexões WebSocket ao apagar a tela.</span>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Usa sinal contínuo de mídia e Web Workers para manter análise de ticks em tempo real.</span>
                </div>
            </div>
        </Card>
    );
};
