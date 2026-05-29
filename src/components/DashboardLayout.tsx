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
        <div className="min-h-screen bg-[#010204] text-white selection:bg-primary/30 overflow-x-hidden relative">
            
            {/* --- PAINEL DE FUNDO DINÂMICO (MEXENDO) --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                
                {/* Grade Cibernética em Movimento Infinito */}
                <div className="absolute inset-0 bg-cyber-moving animate-grid-scroll opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)]" />
                
                {/* Linha de Varredura IA (Scanline) que desce a tela */}
                <div className="absolute top-0 left-0 w-full ai-scanline animate-ai-scan opacity-30" />

                {/* Auras de Cor que Pulsam e se Movem */}
                <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-aurora" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-aurora [animation-delay:5s]" />
                <div className="absolute middle-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Header Profissional */}
                <header className="w-full max-w-4xl flex justify-between items-center py-8 px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            <Zap className="h-5 w-5 text-primary fill-primary/10" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-white">
                                WAVE SNIPER
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]" />
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Neural Stream Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Profit</p>
                            <p className={cn("text-sm font-black", totalProfit >= 0 ? 'text-primary' : 'text-rose-500')}>
                                ${totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <Separator orientation="vertical" className="h-6 bg-white/10" />
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Win Rate</p>
                            <p className="text-sm font-black text-white">{winRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </header>
                
                <main className="w-full max-w-4xl px-4 flex-grow flex flex-col gap-6 pb-20">
                    <ConnectionPanel />
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {children}
                    </div>
                </main>

                <footer className="w-full py-8 flex flex-col items-center gap-4 opacity-40">
                    <div className="flex gap-6">
                        <Globe className="h-3 w-3" />
                        <Shield className="h-3 w-3" />
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">
                        Wave Intelligence v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
};