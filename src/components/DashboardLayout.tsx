"use client";

import React from 'react';
import { BarChart, Zap, Globe, Shield } from 'lucide-react';
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
        <div className="min-h-screen bg-[#05070a] text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Futurista com Grade e Brilhos */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] opacity-50 -z-10" />
                <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] opacity-30 -z-10" />
            </div>

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

                    {/* Contêiner de Conteúdo Futurista */}
                    <div className="relative w-full h-full min-h-[500px]">
                        {/* Decorações Laterais de UI */}
                        <div className="absolute -left-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden xl:block" />
                        <div className="absolute -right-12 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden xl:block" />
                        
                        {/* Children Content */}
                        <div className="animate-in fade-in zoom-in-95 duration-700">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Footer Minimalista High-Tech */}
                <footer className="w-full py-10 flex flex-col items-center gap-6 border-t border-white/5 bg-slate-950/50 backdrop-blur-xl">
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