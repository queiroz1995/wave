"use client";

import React, { useState } from "react";
import { MessageSquare, Eye, EyeOff } from "lucide-react";

interface AIThoughtCardProps {
    aiThought: string;
}

export const AIThoughtCard = ({ aiThought }: AIThoughtCardProps) => {
    const [isHidden, setIsHidden] = useState<boolean>(() => {
        return localStorage.getItem('panel_hide_ai_thought') === 'true';
    });

    const toggleHidden = (hidden: boolean) => {
        setIsHidden(hidden);
        localStorage.setItem('panel_hide_ai_thought', String(hidden));
    };

    if (isHidden) {
        return (
            <div className="flex items-center justify-between px-3 py-1.5 backdrop-blur-xl rounded-xl border border-white/10 bg-[#384d3b]/80 shadow-md">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-3 w-3 text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Fluxo Cognitivo</span>
                </div>
                <button
                    onClick={() => toggleHidden(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Mostrar Fluxo Cognitivo"
                >
                    <EyeOff className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl blur opacity-10" />
            <div className="relative backdrop-blur-xl rounded-xl p-3 flex items-start gap-2.5 border border-white/10 shadow-2xl bg-[#384d3b]">
                <div className="mt-1 h-1 w-1 rounded-full bg-cyan-400 animate-ping" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1">
                            <MessageSquare className="h-2.5 w-2.5 text-cyan-400" />
                            <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Fluxo_Cognitivo</span>
                        </div>
                        <button
                            onClick={() => toggleHidden(true)}
                            className="p-0.5 hover:bg-white/10 rounded text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Ocultar Fluxo Cognitivo"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <p className="text-[11px] font-medium text-slate-200 leading-relaxed italic">
                        "{aiThought}"
                        <span className="inline-block w-1 h-2 bg-cyan-400 ml-1 animate-pulse" />
                    </p>
                </div>
            </div>
        </div>
    );
};