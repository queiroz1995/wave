"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Bot, Zap, Waves, BrainCircuit, Target, Palette, Check, Activity } from 'lucide-react';

interface StrategyAICardProps {
    id: string;
    name: string;
    style: string;
    description: string;
    isActive: boolean;
    onClick: () => void;
    icon: 'wave' | 'cycle' | 'rico' | 'titan' | 'trigger' | 'chroma';
    color: string;
}

const icons = {
    wave: Waves,
    cycle: Zap,
    rico: BrainCircuit,
    titan: Bot,
    trigger: Target,
    chroma: Palette,
};

export const StrategyAICard: React.FC<StrategyAICardProps> = ({ 
    id, name, style, description, isActive, onClick, icon: iconKey, color 
}) => {
    const Icon = icons[iconKey];

    const colorClasses: Record<string, string> = {
        blue: "text-blue-400 bg-blue-500/20 border-blue-500/30 neon-border-blue",
        purple: "text-purple-400 bg-purple-500/20 border-purple-500/30 neon-border-purple",
        cyan: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30 neon-border-cyan",
        orange: "text-orange-400 bg-orange-500/20 border-orange-500/30 neon-border-orange",
        red: "text-red-400 bg-red-500/20 border-red-500/30 neon-border-red",
        green: "text-green-400 bg-green-500/20 border-green-500/30 neon-border-green",
    };

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "relative cursor-pointer transition-all duration-500 overflow-hidden border-2 group glass-panel",
                isActive 
                    ? colorClasses[color] 
                    : "border-white/5 hover:border-white/20 hover:bg-white/5"
            )}
        >
            {/* Animated Gradient Background */}
            <div className={cn(
                "absolute -right-8 -top-8 w-32 h-32 blur-[50px] rounded-full opacity-10 transition-opacity duration-700 group-hover:opacity-30",
                `bg-${color}-500`
            )} />

            {/* Neural Pattern Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none ai-scanline" />

            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                <div className={cn(
                    "p-4 rounded-full transition-all duration-500 shadow-xl relative",
                    isActive ? `bg-${color}-500 text-white scale-110` : "bg-white/5 text-muted-foreground"
                )}>
                    <Icon className="h-8 w-8" />
                    {isActive && (
                        <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                    )}
                </div>

                <div className="space-y-1 relative z-10">
                    <h3 className={cn(
                        "text-xl font-black tracking-tighter uppercase font-mono",
                        isActive ? "text-white" : "text-foreground"
                    )}>
                        {name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5">
                        <Activity className="h-3 w-3 opacity-50" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                            {style}
                        </p>
                    </div>
                </div>

                <p className="text-[11px] text-muted-foreground/80 leading-relaxed h-10 overflow-hidden line-clamp-2 italic font-medium">
                    "{description}"
                </p>

                {isActive && (
                    <div className={cn(
                        "mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse",
                        `bg-${color}-500/20 text-${color}-400 border border-${color}-500/40`
                    )}>
                        Online & Processando
                    </div>
                )}
            </CardContent>
        </Card>
    );
};