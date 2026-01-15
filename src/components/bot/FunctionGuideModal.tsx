"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { BookOpen, ExternalLink, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const guideSections = [
    {
        title: "Suporte via WhatsApp",
        content: [
            {
                term: "Precisa de ajuda?",
                definition: "Se você encontrou um problema, tem alguma dúvida ou sugestão, entre em contato com nosso suporte diretamente pelo WhatsApp. Estamos prontos para ajudar!",
                action: {
                    label: "Falar com Suporte",
                    url: "https://wa.me/5511971620790"
                }
            }
        ]
    },
    {
        title: "Primeiros Passos: Cadastro na Deriv",
        content: [
            {
                term: "Ainda não tem uma conta?",
                definition: "Para usar o bot, você precisa de uma conta na corretora Deriv. O cadastro é rápido, gratuito e você já ganha $10.000 em uma conta demo para testar. Clique no botão abaixo para começar.",
                action: {
                    label: "Cadastrar na Deriv",
                    url: "https://deriv.com/signup/"
                }
            }
        ]
    },
    {
        title: "Conexão e Controle",
        content: [
            {
                term: "Token da Conta",
                definition: "Sua chave de acesso à conta Deriv. Você pode gerar um token no site da Deriv. Certifique-se de dar permissões de 'Leitura' e 'Negociação'.",
                action: {
                    label: "Gerar Token na Deriv",
                    url: "https://app.deriv.com/account/api-token"
                }
            },
            { term: "Tipo de Conta", definition: "Permite escolher entre a conta 'Demo' (com dinheiro virtual, para testes) e a conta 'Real' (com seu dinheiro real)." },
            { term: "Conectar / Desconectar", definition: "Inicia ou encerra a comunicação segura entre o bot e os servidores da Deriv. É o primeiro passo antes de operar." },
            { term: "Iniciar / Parar Bot", definition: "Ativa ou desativa a lógica de negociação do bot. O bot só fará operações quando estiver 'Iniciado'." }
        ]
    },
    {
        title: "Parâmetros de Trade",
        content: [
            { term: "Tipo de Operação", definition: "O bot opera exclusivamente com 'Dígitos', apostando se o último dígito do preço será Par ou Ímpar." },
            { term: "Ativo", definition: "O mercado financeiro onde o bot irá operar, como por exemplo, o 'Índice de Volatilidade 100'." },
            { term: "Duração", definition: "O tempo de validade de cada operação, medido em 'Ticks' (a menor variação de preço do ativo)." },
            { term: "Stake Inicial ($)", definition: "O valor em dólares da sua primeira aposta. Este valor é a base para os cálculos de Martingale e outras gestões de risco." },
            { term: "Filtro de Tendência (%)", definition: "O bot só opera se a diferença percentual entre Par e Ímpar (Força da Tendência) for maior ou igual a este valor, garantindo que o mercado não esteja lateralizado." }
        ]
    },
    {
        title: "Gestão de Risco",
        content: [
            { term: "Fator Martingale", definition: "Após uma perda, o bot multiplica o valor da aposta anterior por este fator. O objetivo é recuperar a perda e obter lucro na próxima vitória. Ex: Fator 2.2." },
            { term: "Máximo de Níveis (Steps)", definition: "O número máximo de vezes consecutivas que o Martingale será aplicado. Se atingir o limite, o ciclo volta para a Stake Inicial, protegendo sua banca." },
            { term: "Take Profit ($)", definition: "Sua meta de lucro. O bot irá parar automaticamente quando o lucro total atingir este valor." },
            { term: "Stop Loss ($)", definition: "Seu limite de perda. O bot para automaticamente se o prejuízo total atingir este valor, evitando perdas maiores." },
            { term: "Filtros Virtuais", definition: "O bot simula operações em segundo plano e só faz uma entrada com dinheiro real quando uma condição é atendida (ex: aguardar X perdas virtuais seguidas). Aumenta a segurança e a assertividade." },
            { term: "Gerenciamento Soros", definition: "Reinveste o lucro de uma vitória na próxima aposta por um número definido de níveis, potencializando ganhos em sequências positivas." }
        ]
    },
    {
        title: "Estratégias de Dígitos",
        content: [
            { term: "Estratégia de Desequilíbrio", definition: "Analisa uma janela dos últimos dígitos. Se a porcentagem de um tipo (ex: Ímpar) ultrapassa um limite (ex: 55%), o bot entra no tipo oposto (Par), apostando na reversão do desequilíbrio." },
            { term: "Estratégia Padrão de Cores", definition: "Permite definir uma sequência específica de dígitos (E=Par, O=Ímpar). O bot aguarda essa sequência exata e, em seguida, aposta no dígito configurado (Par ou Ímpar)." },
        ]
    }
];

export const FunctionGuideModal = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <HelpCircle className="h-5 w-5" />
                    <span className="sr-only">Guia de Funções</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Guia de Funções
                    </DialogTitle>
                    <DialogDescription>
                        Entenda como cada função do bot opera.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60dvh] pr-4">
                    <Accordion type="single" collapsible className="w-full">
                        {guideSections.map((section, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-base text-left">{section.title}</AccordionTrigger>
                                <AccordionContent className="space-y-3 pt-2">
                                    {section.content.map((item, itemIndex) => (
                                        <div key={itemIndex}>
                                            <p className="font-semibold text-foreground/90">{item.term}</p>
                                            <p className="text-sm text-muted-foreground">{item.definition}</p>
                                            {item.action && (
                                                <a href={item.action.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                                                    <Button>
                                                        {item.action.label}
                                                        <ExternalLink className="h-4 w-4 ml-2" />
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};