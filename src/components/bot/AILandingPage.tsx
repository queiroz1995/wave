"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Sparkles, Zap, Target } from 'lucide-react';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "I.A WAVE", 
        style: "All-In-One Sniper", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "O núcleo mais poderoso da Rico Intelligence. Inclui modos tradicionais (Par/Ímpar) e os snipers de barreira (3+, 4+, 6+).",
        compatibleModes: ['evenOdd', 'overUnder'] 
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
                <p className="text-sm text-muted-foreground font-medium">Ative a inteligência WAVE para acessar todos os modos de operação.</p>
            </div>

            <div className="flex justify-center max-w-4xl mx-auto">
                {strategies.map((ia) => (
                    <div key={ia.id} className="max-w-sm">
                        <StrategyAICard 
                            id={ia.id}
                            name={ia.name}
                            style={ia.style}
                            image={ia.image}
                            color={ia.color}
                            description={ia.description}
                            isActive={false}
                            onClick={() => selectAI(ia)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};