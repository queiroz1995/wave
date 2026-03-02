"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Bot, Zap, Waves, BrainCircuit, Target, Palette, Check, Activity, Cpu, CircuitBoard, Fingerprint } from 'lucide-react';

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
        blue: "text-blue-600 bg-blue-50 border-blue-200 neon-border-blue",
        purple: "text-purple-600 bg-purple-50 border-purple-200 neon-border-purple",
        cyan: "text-cyan-600 bg-cyan-50 border-cyan-200 neon-border-cyan",
        orange: "text-orange-600 bg-orange-50 border-orange-200 neon-border-orange",
        red: "text-red-600 bg-red-50 border-red-200 neon-border-red",
        green: "text-green-600 bg-green-50 border-green-200 neon-border-green",
    };

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "relative cursor-pointer transition-all duration-300 overflow-hidden border-2 group glass-panel rounded-[2rem]",
                isActive 
                    ? colorClasses[color] 
                    : "border-gray-100 hover:border-gray-200 hover:bg-white"
            )}
        >
            {/* Efeito de luz de fundo */}
            <div className={cn(
                "absolute -right-8 -top-8 w-32 h-32 blur-[40px] rounded-full opacity-10 transition-opacity duration-700 group-hover:opacity-20",
                `bg-${color}-500`
            )} />

            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                {/* Ícone Estilizado como Núcleo de Robô */}
                <div className={cn(
                    "p-5 rounded-[1.5rem] transition-all duration-500 shadow-lg relative border-2",
                    isActive 
                        ? `bg-${color}-500 text-white scale-110 border-white/20 shadow-${color}-500/40` 
                        : "bg-gray-100 text-gray-400 border-transparent"
                )}>
                    <Icon className="h-10 w-10" />
                    {isActive && (
                        <div className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-white/20"></span>
                        </div>
                    )}
                </div>

                <div className="space-y-1 relative z-10">
                    <h3 className={cn(
                        "text-xl font-black tracking-tighter uppercase font-mono",
                        isActive ? `text-${color}-600` : "text-gray-800"
                    )}>
                        {name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5">
                        <Activity className={cn("h-3 w-3", isActive ? `text-${color}-500` : "text-gray-300")} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            {style}
                        </p>
                    </div>
                </div>

                <p className="text-[11px] leading-relaxed h-12 overflow-hidden line-clamp-2 italic font-medium text-gray-500 px-2">
                    {description}
                </p>

                {isActive ? (
                    <div className={cn(
                        "mt-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2",
                        `bg-${color}-100 text-${color}-600 border-${color}-200`
                    )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", `bg-${color}-500`)} />
                        Sincronizado
                    </div>
                ) : (
                    <div className="mt-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">
                        Selecionar
                    </div>
                )}
            </CardContent>
        </Card>
    );
};