"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Sparkles } from 'lucide-react';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "I.A WAVE", 
        style: "Vortex-Momentum", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "Núcleo Único de Alta Performance. Combina Momentum Neural com proteção Double-Loss Reset para lucros rápidos.",
        compatibleModes: ['evenOdd'] 
    }
];

export const AILandingPage = () => {
    const { selectAI } = useBotContext();

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <Sparkles className="h-3 w-3" /> Rico Intelligence v2.0
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Ativar Núcleo Único</h1>
                <p className="text-sm text-muted-foreground font-medium">O sistema foi consolidado na I.A WAVE para máxima eficiência operacional.</p>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-sm">
                    {strategies.map((ia) => (
                        <StrategyAICard 
                            key={ia.id}
                            id={ia.id}
                            name={ia.name}
                            style={ia.style}
                            image={ia.image}
                            color={ia.color}
                            description={ia.description}
                            isActive={false}
                            onClick={() => selectAI(ia)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};