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
        blue: "text-blue-300 bg-blue-500/30 border-blue-400/50 neon-border-blue",
        purple: "text-purple-300 bg-purple-500/30 border-purple-400/50 neon-border-purple",
        cyan: "text-cyan-300 bg-cyan-500/30 border-cyan-400/50 neon-border-cyan",
        orange: "text-orange-300 bg-orange-500/30 border-orange-400/50 neon-border-orange",
        red: "text-red-300 bg-red-500/30 border-red-400/50 neon-border-red",
        green: "text-green-300 bg-green-500/30 border-green-400/50 neon-border-green",
    };

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "relative cursor-pointer transition-all duration-300 overflow-hidden border-2 group glass-panel",
                isActive 
                    ? colorClasses[color] 
                    : "border-white/10 hover:border-white/30 hover:bg-white/10"
            )}
        >
            {/* Bright Gradient Background */}
            <div className={cn(
                "absolute -right-8 -top-8 w-32 h-32 blur-[40px] rounded-full opacity-20 transition-opacity duration-700 group-hover:opacity-40",
                `bg-${color}-400`
            )} />

            {/* Neural Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none ai-scanline" />

            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                <div className={cn(
                    "p-4 rounded-2xl transition-all duration-500 shadow-xl relative",
                    isActive ? `bg-${color}-500 text-white scale-105` : "bg-white/10 text-muted-foreground"
                )}>
                    <Icon className="h-8 w-8" />
                </div>

                <div className="space-y-1 relative z-10">
                    <h3 className={cn(
                        "text-xl font-black tracking-tighter uppercase font-mono",
                        isActive ? "text-white" : "text-foreground"
                    )}>
                        {name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5">
                        <Activity className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-50")} />
                        <p className={cn(
                            "text-[10px] font-bold uppercase tracking-[0.2em]",
                            isActive ? "text-white" : "text-muted-foreground"
                        )}>
                            {style}
                        </p>
                    </div>
                </div>

                <p className={cn(
                    "text-[11px] leading-relaxed h-10 overflow-hidden line-clamp-2 italic font-medium",
                    isActive ? "text-white/90" : "text-muted-foreground"
                )}>
                    "{description}"
                </p>

                {isActive && (
                    <div className={cn(
                        "mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white border border-white/40"
                    )}>
                        Ativa
                    </div>
                )}
            </CardContent>
        </Card>
    );
};