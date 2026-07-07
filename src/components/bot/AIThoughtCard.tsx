"use client";

import React from "react";
import { MessageSquare } from "lucide-react";

interface AIThoughtCardProps {
    aiThought: string;
}

export const AIThoughtCard = ({ aiThought }: AIThoughtCardProps) => {
    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-xl blur opacity-10" />
            <div className="relative backdrop-blur-xl rounded-xl p-3 flex items-start gap-2.5 border border-white/10 shadow-2xl bg-[#384d3b]">
                <div className="mt-1 h-1 w-1 rounded-full bg-cyan-400 animate-ping" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                        <MessageSquare className="h-2.5 w-2.5 text-cyan-400" />
                        <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Fluxo_Cognitivo</span>
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