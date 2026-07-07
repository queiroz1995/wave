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
        <div className="min-h-screen bg-[#010417] text-white selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">
            
            {/* --- PAINEL DE FUNDO NUCLEO WAVE --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Fundo Principal Escuro */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#010417] via-[#010417] to-[#000000]" />
                
                {/* Grade Técnica Sutil (Nucleo Wave) */}
                <div className="absolute inset-0 bg-cyber-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)] opacity-40" />
                
                {/* Auras de Cores Frias (Azul e Ciano) */}
                <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-indigo-800/20 rounded-full blur-[180px] animate-drift" />
                <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] bg-cyan-600/15 rounded-full blur-[150px] animate-drift [animation-delay:5s]" />
                <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[160px] animate-drift [animation-delay:10s]" />
                
                {/* Linha de Horizonte Neon (Mais sutil) */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col items-center flex-grow w-full px-2 sm:px-4">
                {/* Header Limpo e Profissional - Otimizado para Mobile */}
                <header className="w-full max-w-md flex justify-between items-center py-3 px-2 sm:py-6 sm:px-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 border border-white/20 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Zap className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400/10" />
                        </div>
                        <div>
                            <h1 className="text-sm sm:text-base font-black uppercase tracking-tighter text-white leading-none">
                                WAVE SNIPER
                            </h1>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,1)]" />
                                <span className="text-[6px] sm:text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">System Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 px-2.5 py-1 sm:px-4 sm:py-2 bg-white/10 border border-white/10 rounded-xl backdrop-blur-md shadow-lg">
                        <div className="text-center">
                            <p className="text-[6px] sm:text-[7px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Profit</p>
                            <p className={cn("text-[10px] sm:text-xs font-black", totalProfit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'text-rose-400')}>
                                ${totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <Separator orientation="vertical" className="h-3 sm:h-4 bg-white/20" />
                        <div className="text-center">
                            <p className="text-[6px] sm:text-[7px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Win Rate</p>
                            <p className="text-[10px] sm:text-xs font-black text-white">{winRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </header>
                
                <main className="w-full max-w-md px-1 flex-grow flex flex-col gap-3 pb-8">
                    <ConnectionPanel />
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 flex-grow flex flex-col">
                        {children}
                    </div>
                </main>

                <footer className="w-full py-4 flex flex-col items-center gap-1 opacity-60 mt-auto">
                    <div className="flex gap-4 text-cyan-400">
                        <Globe className="h-3 w-3" />
                        <Shield className="h-3 w-3" />
                    </div>
                    <p className="text-[7px] font-bold uppercase tracking-[0.4em] text-slate-400">
                        Wave Intelligence v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
};