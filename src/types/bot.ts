"use client";

export type LogType = 'WIN' | 'LOSS' | 'ERROR' | 'INFO' | 'TRADE';

export interface LogEntry {
    timestamp: string;
    message: string;
    type: LogType;
    // Novos campos para logs de trade
    stake?: number;
    profit?: number;
    strategyName?: string;
    exitDigit?: number; // Adicionado para mostrar o dígito final
    contractType?: ContractType; // Adicionado para mostrar o tipo de contrato
    barrier?: number; // Adicionado para mostrar a barreira (se aplicável)
}

export type SignalType = 'EVEN' | 'ODD' | 'OVER' | 'UNDER';

export interface SignalEntry {
    id: string; // Adicionando ID para rastreamento
    timestamp: string;
    strategy: string;
    signal: SignalType;
    details: string;
    winRate?: string;
    
    // Campos de resultado do trade
    result?: 'WIN' | 'LOSS';
    profit?: number;
    stake?: number;
    exitDigit?: number; // Adicionado para mostrar o dígito final
}

export type ContractType = 'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER';

export type TradeType = 'digit';

export interface StrategyPerformance {
    id: string;
    name: string;
    wins: number;
    losses: number;
    winRate: string;
    lastResult: 'WIN' | 'LOSS' | 'WAITING';
    description: string;
    isActive: boolean;
}