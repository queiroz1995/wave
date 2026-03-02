"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface StrategyAICardProps {
    id: string;
    name: string;
    style: string;
    description: string;
    isActive: boolean;
    onClick: () => void;
    image: string;
    color: string;
}

export const StrategyAICard: React.FC<StrategyAICardProps> = ({ 
    id, name, style, description, isActive, onClick, image, color 
}) => {
    const colorClasses: Record<string, string> = {
        blue: "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] bg-blue-50/30",
        purple: "border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-50/30",
        cyan: "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-cyan-50/30",
        orange: "border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)] bg-orange-50/30",
        red: "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-50/30",
        green: "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-green-50/30",
    };

    return (
        <Card 
            onClick={onClick}
            className={cn(
                "relative cursor-pointer transition-all duration-500 overflow-hidden border-2 group glass-panel rounded-[2.5rem]",
                isActive 
                    ? colorClasses[color] 
                    : "border-gray-100 hover:border-primary/30 hover:shadow-xl"
            )}
        >
            <CardContent className="p-0 flex flex-col items-center text-center">
                {/* Imagem do Robô */}
                <div className="w-full aspect-square relative overflow-hidden">
                    <img 
                        src={image} 
                        alt={name} 
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                            !isActive && "grayscale-[0.3] group-hover:grayscale-0"
                        )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Badge de Status na Imagem */}
                    {isActive && (
                        <div className="absolute top-4 right-4 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </div>
                    )}

                    {/* Nome flutuando sobre a imagem */}
                    <div className="absolute bottom-4 left-0 w-full px-4 text-left">
                         <h3 className={cn(
                            "text-xl font-black tracking-tighter uppercase font-mono text-white drop-shadow-lg",
                        )}>
                            {name}
                        </h3>
                    </div>
                </div>

                <div className="p-5 space-y-3 w-full bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Activity className={cn("h-3 w-3", isActive ? `text-${color}-500` : "text-gray-400")} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                                {style}
                            </p>
                        </div>
                        {isActive && (
                             <div className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                `bg-${color}-100 text-${color}-600 border-${color}-200`
                            )}>
                                ONLINE
                            </div>
                        )}
                    </div>

                    <p className="text-[10px] leading-relaxed h-12 overflow-hidden line-clamp-3 font-medium text-gray-600 text-left">
                        {description}
                    </p>
                    
                    <div className={cn(
                        "w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        isActive 
                            ? `bg-${color}-500 text-white shadow-lg` 
                            : "bg-gray-100 text-gray-400 group-hover:bg-primary group-hover:text-white"
                    )}>
                        {isActive ? "ESPECIALISTA ATIVO" : "ATIVAR NÚCLEO"}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};