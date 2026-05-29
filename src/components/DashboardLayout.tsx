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
        <div className="min-h-screen bg-[#020408] text-white selection:bg-primary/30 overflow-x-hidden relative">
            
            {/* --- PAINEL DE FUNDO TECNOLÓGICO --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Efeito de Profundidade */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                
                {/* Grade Técnica Estática e Elegante */}
                <div className="absolute inset-0 bg-cyber-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)] opacity-40" />
                
                {/* Luzes de Fundo Suaves (Auras) */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[120px] animate-drift" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] animate-drift [animation-delay:5s]" />
                
                {/* Linha de Horizonte Neon */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Header Limpo e Profissional */}
                <header className="w-full max-w-4xl flex justify-between items-center py-8 px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl shadow-xl">
                            <Zap className="h-5 w-5 text-primary fill-primary/10" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-white">
                                WAVE SNIPER
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">System Ready</span>
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
                    <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-500">
                        Wave Intelligence v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
};