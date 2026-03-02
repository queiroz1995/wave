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
                "relative cursor-pointer transition-all duration-300 overflow-hidden border-2 group glass-panel",
                isActive 
                    ? colorClasses[color] 
                    : "border-gray-100 hover:border-gray-200 hover:bg-white"
            )}
        >
            {/* Soft Glow Background */}
            <div className={cn(
                "absolute -right-8 -top-8 w-32 h-32 blur-[40px] rounded-full opacity-10 transition-opacity duration-700 group-hover:opacity-20",
                `bg-${color}-500`
            )} />

            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                <div className={cn(
                    "p-4 rounded-2xl transition-all duration-500 shadow-sm relative",
                    isActive ? `bg-${color}-500 text-white scale-105` : "bg-gray-100 text-gray-400"
                )}>
                    <Icon className="h-8 w-8" />
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

                <p className="text-[11px] leading-relaxed h-10 overflow-hidden line-clamp-2 italic font-medium text-gray-500">
                    "{description}"
                </p>

                {isActive && (
                    <div className={cn(
                        "mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        `bg-${color}-100 text-${color}-600 border-${color}-200`
                    )}>
                        Módulo Ativo
                    </div>
                )}
            </CardContent>
        </Card>
    );
};