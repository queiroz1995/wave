"use client";

export type LogType = 'WIN' | 'LOSS' | 'ERROR' | 'INFO' | 'TRADE';

export interface LogEntry {
    timestamp: string;
    message: string;
    type: LogType;
    stake?: number;
    profit?: number;
    strategyName?: string;
    exitDigit?: number;
    contractType?: ContractType;
    barrier?: number;
    isVirtual?: boolean;
}

export type SignalType = 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | 'CALL' | 'PUT';

export interface SignalEntry {
    id: string;
    timestamp: string;
    strategy: string;
    signal: SignalType;
    details: string;
    winRate?: string;
    result?: 'WIN' | 'LOSS';
    status?: string;
    outcome?: string;
    profit?: number;
    stake?: number;
    exitDigit?: number;
    digit?: number;
    exit_digit?: number;
    finalDigit?: number;
}

export type ContractType = 'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | 'CALL' | 'PUT';

export type TradeType = 'digit' | 'rise_fall';

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