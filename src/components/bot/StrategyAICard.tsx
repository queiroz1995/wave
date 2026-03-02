"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Bot, Zap, Waves, BrainCircuit, Target, Palette, Check } from 'lucide-react';

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

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "relative cursor-pointer transition-all duration-300 overflow-hidden border-2 group",
                isActive 
                    ? `border-${color}-500 bg-${color}-500/10 shadow-[0_0_15px_rgba(var(--${color}),0.3)]` 
                    : "border-border/40 hover:border-primary/50 bg-card/40"
            )}
        >
            {/* Background Glow Effect */}
            <div className={cn(
                "absolute -right-4 -top-4 w-24 h-24 blur-3xl rounded-full opacity-20 transition-opacity group-hover:opacity-40",
                `bg-${color}-500`
            )} />

            <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                <div className={cn(
                    "p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-lg",
                    isActive ? `bg-${color}-500 text-white` : "bg-muted text-muted-foreground"
                )}>
                    <Icon className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                    <h3 className={cn(
                        "text-lg font-black tracking-tighter uppercase",
                        isActive ? `text-${color}-500` : "text-foreground"
                    )}>
                        {name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        {style}
                    </p>
                </div>

                <p className="text-[11px] text-muted-foreground leading-tight h-8 overflow-hidden line-clamp-2">
                    {description}
                </p>

                {isActive && (
                    <div className={cn(
                        "absolute top-2 right-2 p-1 rounded-full",
                        `bg-${color}-500 text-white`
                    )}>
                        <Check className="h-3 w-3" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};