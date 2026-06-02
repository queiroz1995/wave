"use client";

import React from 'react';
import { Zap, Globe, Shield } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { Separator } from '@/components/ui/separator';
import { ConnectionPanel } from './bot/ConnectionPanel';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { totalProfit, wins, losses } = useBotContext();
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#0a1128] text-white selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">
            
            {/* --- PAINEL DE FUNDO COLORIDO E VIBRANTE --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Brilho de Fundo Principal (Azul/Roxo) */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0a1128] to-[#070a1e]" />
                
                {/* Grade Técnica Colorida */}
                <div className="absolute inset-0 bg-cyber-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)] opacity-60" />
                
                {/* Grandes Auras de Cores Vibrantes (Ciano, Roxo e Esmeralda) */}
                <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[60%] bg-indigo-600/30 rounded-full blur-[140px] animate-drift" />
                <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/20 rounded-full blur-[130px] animate-drift [animation-delay:4s]" />
                <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[60%] bg-emerald-500/15 rounded-full blur-[150px] animate-drift [animation-delay:8s]" />
                
                {/* Linha de Horizonte Neon Colorida */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col items-center flex-grow w-full">
                {/* Header Limpo e Profissional - Otimizado para Mobile */}
                <header className="w-full max-w-md flex justify-between items-center py-4 px-4 sm:py-8 sm:px-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-white/10 border border-white/20 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 fill-cyan-400/10" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-black uppercase tracking-tighter text-white leading-none">
                                WAVE SNIPER
                            </h1>
                            <div className="flex items-center gap-1 mt-1">
                                <div className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                                <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">System Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6 px-3 py-1.5 sm:px-6 sm:py-3 bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-lg">
                        <div className="text-center">
                            <p className="text-[7px] sm:text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Profit</p>
                            <p className={cn("text-xs sm:text-sm font-black", totalProfit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-rose-400')}>
                                ${totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <Separator orientation="vertical" className="h-4 sm:h-6 bg-white/20" />
                        <div className="text-center">
                            <p className="text-[7px] sm:text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Win Rate</p>
                            <p className="text-xs sm:text-sm font-black text-white">{winRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </header>
                
                <main className="w-full max-w-md px-3 flex-grow flex flex-col gap-4 pb-12">
                    <ConnectionPanel />
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 flex-grow flex flex-col">
                        {children}
                    </div>
                </main>

                <footer className="w-full py-6 flex flex-col items-center gap-2 opacity-60 mt-auto">
                    <div className="flex gap-6 text-cyan-400">
                        <Globe className="h-3.5 w-3.5" />
                        <Shield className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400">
                        Wave Intelligence v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
};