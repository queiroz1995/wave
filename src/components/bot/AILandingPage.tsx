"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Zap } from 'lucide-react';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "NÚCLEO WAVE", 
        style: "Especialista em Paridade", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "Inteligência Artificial focada em sequências de repetição. Opera contra a tendência de paridade com alta precisão.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "frequencySniper", 
        name: "NEURAL SNIPER", 
        style: "Analista de Zonas Mortas", 
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=600",
        color: "orange",
        description: "Mapeia dígitos em desuso e opera Over/Under em zonas de segurança. Muito mais estável e inteligente.",
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
                <h1 className="text-4xl font-black uppercase tracking-tighter">Ative o Núcleo</h1>
                <p className="text-sm text-muted-foreground font-medium">Selecione a I.A para iniciar as operações de inteligência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {strategies.map((ia) => (
                    <div key={ia.id} className="w-full">
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