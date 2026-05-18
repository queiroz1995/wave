"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Sparkles, Zap, Target } from 'lucide-react';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "I.A WAVE", 
        style: "Vortex-Momentum", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "Núcleo de Tendência Tradicional. Foco em Par/Ímpar com alta frequência de entradas.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "xHunter4", 
        name: "X-HUNTER (4+)", 
        style: "High Frequency", 
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=600",
        color: "green",
        description: "Equilíbrio e assertividade. Vence se o dígito for 5, 6, 7, 8 ou 9. Lucro moderado e constante.",
        compatibleModes: ['overUnder'] 
    },
    { 
        id: "xHunter6", 
        name: "X-HUNTER (6+)", 
        style: "High Reward", 
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=600",
        color: "orange",
        description: "Busca lucros de 230%. Vence se o dígito for 7, 8 ou 9. Exige mais paciência e exaustão de mercado.",
        compatibleModes: ['overUnder'] 
    }
];

export const AILandingPage = () => {
    const { selectAI } = useBotContext();

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <Zap className="h-3 w-3" /> Rico Intelligence v2.0
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Selecione o Núcleo</h1>
                <p className="text-sm text-muted-foreground font-medium">Escolha a inteligência que melhor se adapta à sua banca.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
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