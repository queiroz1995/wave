"use client";

import React from 'react';
import { useBotContext } from '@/context/BotContext';
import { StrategyAICard } from './StrategyAICard';
import { Sparkles } from 'lucide-react';
import { ConnectionPanel } from './ConnectionPanel';

const strategies = [
    { 
        id: "trendSurfer", 
        name: "I.A Wave", 
        style: "High-Momentum", 
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600",
        color: "blue",
        description: "Especialista em ondas de tendência e padrões xadrez ultrarrápidos.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "probabilistic", 
        name: "I.A Cycle", 
        style: "Market-Cycle", 
        image: "https://images.unsplash.com/photo-1535378620166-273708d44e4c?auto=format&fit=crop&q=80&w=600",
        color: "purple",
        description: "Analisa o fluxo de mercado e ciclos estatísticos para máxima precisão.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "neuralRico", 
        name: "I.A Rico", 
        style: "Deep-Neural", 
        image: "https://images.unsplash.com/photo-1675271591211-126ad94e495d?auto=format&fit=crop&q=80&w=600",
        color: "cyan",
        description: "Algoritmo de saturação neural focado em reversões estratégicas.",
        compatibleModes: ['evenOdd'] 
    },
    { 
        id: "smartAI", 
        name: "I.A Titan", 
        style: "Titan-Processor", 
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600",
        color: "orange",
        description: "Processador de padrões que identifica o que o mercado está respeitando.",
        compatibleModes: ['evenOdd', 'overUnder'] 
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
                <h1 className="text-4xl font-black uppercase tracking-tighter">Ativar Especialista</h1>
                <p className="text-sm text-muted-foreground font-medium">Selecione o núcleo robótico para iniciar as operações neurais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="pt-8 border-t border-gray-100">
                <ConnectionPanel />
            </div>
        </div>
    );
};