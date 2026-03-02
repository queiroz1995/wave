"use client";

import React from 'react';
import { BarChart } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { Separator } from '@/components/ui/separator';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { totalProfit, accountBalance, wins, losses } = useBotContext();
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center">
            {/* Header Simplificado e Centralizado */}
            <header className="w-full max-w-4xl flex justify-between items-center py-6 px-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl">
                        <BarChart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">
                            Rico 2.0
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Servidor Ativo</span>
                        </div>
                    </div>
                </div>

                {/* Status Rápido no Topo (Desktop) */}
                <div className="hidden sm:flex items-center gap-6 bg-white/50 backdrop-blur-md border border-white/40 p-3 px-6 rounded-2xl shadow-sm">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Lucro Total</p>
                        <p className={`text-sm font-black ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${totalProfit.toFixed(2)}
                        </p>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="text-center">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Assertividade</p>
                        <p className="text-sm font-black text-primary">
                            {winRate.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </header>
            
            <main className="w-full max-w-4xl px-4 flex-grow flex flex-col pb-10">
                {/* O conteúdo agora ocupa o centro da tela sem abas laterais */}
                <div className="w-full h-full">
                    {children}
                </div>
            </main>

            {/* Footer Minimalista */}
            <footer className="py-6 text-center">
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.4em]">
                    Powered by Rico Intelligence • 2024
                </p>
            </footer>
        </div>
    );
};