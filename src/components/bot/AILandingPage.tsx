"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Sparkles, Zap } from 'lucide-react';

const strategies = [
    { 
        id: "iaNano", 
        name: "I.A NANO", 
        style: "Micro-Scalping", 
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=600",
        color: "cyan",
        description: "Especialista em micro-operações. Gatilhos ultra-rápidos baseados em 2 ticks e probabilidade neural > 65%. Ideal para bater metas curtas com frequência.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "trendSurfer", 
        name: "I.A WAVE", 
        style: "Vortex-Momentum", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "Núcleo de Tendência. Combina Momentum Neural com proteção de reversão para ciclos de lucro consistentes.",
        compatibleModes: ['evenOdd'] 
    }
];

export const AILandingPage = () => {
    const { selectAI } = useBotContext();

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <Zap className="h-3 w-3" /> Rico Intelligence v2.0
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Selecione o Núcleo</h1>
                <p className="text-sm text-muted-foreground font-medium">Escolha a inteligência que melhor se adapta à sua banca.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
    );
};