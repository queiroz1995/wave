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
        <div className="min-h-screen bg-[#02040a] text-white selection:bg-indigo-500/30 overflow-x-hidden relative">
            
            {/* --- FUNDO ANIMADO --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Grade em Movimento */}
                <div className="absolute inset-0 bg-grid-moving animate-grid-move opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
                
                {/* Névoas de Cor Pulsantes */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-glow [animation-delay:2s]" />
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow [animation-delay:4s]" />

                {/* Partículas de Luz Flutuantes */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400 rounded-full blur-sm animate-float opacity-50" />
                <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-emerald-400 rounded-full blur-md animate-float [animation-delay:3s] opacity-30" />
                <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-white rounded-full blur-none animate-float [animation-delay:7s] opacity-60" />
            </div>
            {/* --------------------- */}

            <div className="relative z-10 flex flex-col items-center">
                {/* Header High-Tech */}
                <header className="w-full max-w-4xl flex justify-between items-center py-8 px-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-indigo-500/20 rounded-2xl blur-lg group-hover:bg-indigo-500/40 transition-all duration-500" />
                            <div className="relative p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
                                <Zap className="h-6 w-6 text-indigo-400 fill-indigo-400/20" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic uppercase tracking-tighter bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                                WAVE SNIPER
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Link Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Rápido (Desktop) */}
                    <div className="hidden sm:flex items-center gap-8 bg-white/5 backdrop-blur-2xl border border-white/10 p-4 px-8 rounded-[2rem] shadow-2xl">
                        <div className="text-center group">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-400 transition-colors">Session Profit</p>
                            <p className={cn(
                                "text-lg font-black tracking-tighter",
                                totalProfit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-rose-400'
                            )}>
                                ${totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <Separator orientation="vertical" className="h-8 bg-white/10" />
                        <div className="text-center group">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-400 transition-colors">Efficiency</p>
                            <p className="text-lg font-black text-white tracking-tighter">
                                {winRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </header>
                
                <main className="w-full max-w-4xl px-4 flex-grow flex flex-col gap-6 pb-20">
                    {/* Connection Panel Integrado */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000" />
                        <ConnectionPanel />
                    </div>

                    {/* Contêiner de Conteúdo */}
                    <div className="relative w-full h-full min-h-[500px]">
                        <div className="animate-in fade-in zoom-in-95 duration-700">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Footer Minimalista */}
                <footer className="w-full py-10 flex flex-col items-center gap-6 border-t border-white/5 bg-slate-950/20 backdrop-blur-xl">
                    <div className="flex gap-8 opacity-20">
                        <Globe className="h-4 w-4" />
                        <Shield className="h-4 w-4" />
                        <Zap className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
                        © 2024 WAVE INTELLIGENCE • SYSTEM V2.4
                    </p>
                </footer>
            </div>
        </div>
    );
};