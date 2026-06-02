"use client";

import React from 'react';
import { Zap, Shield } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
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
        <div className="min-h-screen bg-[#030712] text-white selection:bg-cyan-500/30 overflow-x-hidden relative flex flex-col font-sans">
            
            {/* --- BACKGROUND ULTRA LIMPO E FUTURISTA --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[#030712]" />
                {/* Brilho sutil de fundo */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center flex-grow w-full">
                {/* Header Minimalista */}
                <header className="w-full max-w-md flex justify-between items-center py-4 px-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                            <Zap className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400/10" />
                        </div>
                        <div>
                            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white leading-none">
                                WAVE SNIPER
                            </h1>
                            <span className="text-[7px] font-bold uppercase tracking-widest text-cyan-400/60 block mt-0.5">AI CORE ACTIVE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-md">
                        <div className="text-right">
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest block">Lucro</span>
                            <span className={cn("text-[10px] font-black", totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                ${totalProfit.toFixed(2)}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="text-right">
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest block">Assertividade</span>
                            <span className="text-[10px] font-black text-white">{winRate.toFixed(0)}%</span>
                        </div>
                    </div>
                </header>
                
                <main className="w-full max-w-md px-3 flex-grow flex flex-col gap-3 pb-8">
                    <ConnectionPanel />
                    <div className="animate-in fade-in duration-700 flex-grow flex flex-col">
                        {children}
                    </div>
                </main>

                <footer className="w-full py-4 flex flex-col items-center gap-1 opacity-40 mt-auto">
                    <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-500">
                        Wave Intelligence v2.4 • Secure Connection
                    </p>
                </footer>
            </div>
        </div>
    );
};