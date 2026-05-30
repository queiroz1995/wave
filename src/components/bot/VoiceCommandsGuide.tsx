"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Mic, Play, ShieldAlert, DollarSign, BarChart3, Settings, Table, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VoiceCommandsGuide = () => {
    const [isOpen, setIsOpen] = useState(false);

    const commandCategories = [
        {
            title: "Operações Rápidas",
            icon: Play,
            color: "text-emerald-400",
            commands: [
                { phrase: "Comprar Par", desc: "Entra imediatamente em Par" },
                { phrase: "Comprar Ímpar", desc: "Entra imediatamente em Ímpar" },
                { phrase: "Comprar Par com gale até 3", desc: "Entra em Par com recuperação automática de até 3 gales" },
                { phrase: "Iniciar / Parar", desc: "Inicia ou pausa a automação do robô" }
            ]
        },
        {
            title: "Gestão de Risco & Gale",
            icon: ShieldAlert,
            color: "text-rose-400",
            commands: [
                { phrase: "Fator Martingale de 2.2", desc: "Altera o multiplicador de recuperação" },
                { phrase: "Gale máximo de 4", desc: "Define o limite de níveis de Martingale" },
                { phrase: "Desativar Martingale", desc: "Desliga a recuperação de perdas" },
                { phrase: "Ativar Soros", desc: "Ativa o reinvestimento de lucros" }
            ]
        },
        {
            title: "Configurações de Valores",
            icon: DollarSign,
            color: "text-cyan-400",
            commands: [
                { phrase: "Entrada de 1 dólar", desc: "Altera o valor da aposta inicial" },
                { phrase: "Dobra aposta", desc: "Dobra o valor da entrada atual" },
                { phrase: "Meta de 5 dólares", desc: "Define o objetivo de ganho (Take Profit)" },
                { phrase: "Stop de 15 dólares", desc: "Define o limite de perda (Stop Loss)" }
            ]
        },
        {
            title: "Modalidades & Barreiras",
            icon: Settings,
            color: "text-amber-400",
            commands: [
                { phrase: "Modo acima ou abaixo", desc: "Muda modalidade para Acima/Abaixo" },
                { phrase: "Modo par ou ímpar", desc: "Muda modalidade para Par/Ímpar" },
                { phrase: "Direção acima / Direção abaixo", desc: "Define direção do Over/Under" },
                { phrase: "Barreira de 4", desc: "Define o dígito alvo de barreira" }
            ]
        },
        {
            title: "Planilha de Gestão",
            icon: Table,
            color: "text-purple-400",
            commands: [
                { phrase: "Banca inicial da planilha de 100", desc: "Define banca inicial na planilha" },
                { phrase: "Meta diária de 5 por cento", desc: "Define meta diária na planilha" },
                { phrase: "Aplicar meta da planilha", desc: "Aplica metas calculadas ao bot" },
                { phrase: "Bati a meta do dia", desc: "Conclui o dia atual com vitória" }
            ]
        },
        {
            title: "Consultas & Estatísticas",
            icon: BarChart3,
            color: "text-indigo-400",
            commands: [
                { phrase: "Qual a meta configurada", desc: "Informa a meta de lucro atual" },
                { phrase: "Qual o valor da entrada", desc: "Informa o valor da stake atual" },
                { phrase: "Quanto falta para a meta", desc: "Informa a distância para o objetivo" },
                { phrase: "Como estão as operações", desc: "Relatório de vitórias, derrotas e assertividade" }
            ]
        }
    ];

    return (
        <Card className="bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-300">
            <Button 
                variant="ghost" 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-12 px-4 flex items-center justify-between hover:bg-white/5 text-white rounded-none"
            >
                <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">Comandos de Voz Disponíveis</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </Button>

            {isOpen && (
                <CardContent className="p-4 pt-0 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed border-b border-white/5 pb-2">
                        Ative o microfone permanente e fale naturalmente. Você pode combinar comandos usando "e" (ex: "entrada de 1 dólar e meta de 5").
                    </p>
                    
                    <div className="space-y-4">
                        {commandCategories.map((cat, idx) => {
                            const Icon = cat.icon;
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className={cn("h-3.5 w-3.5", cat.color)} />
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300">{cat.title}</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1.5 pl-1">
                                        {cat.commands.map((cmd, cIdx) => (
                                            <div key={cIdx} className="p-2 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-cyan-400 font-mono">
                                                    "{cmd.phrase}"
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    {cmd.desc}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};