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
}

export type SignalType = 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | 'CALL' | 'PUT' | 'ONETOUCH' | 'NOTOUCH';

export interface SignalEntry {
    id: string;
    timestamp: string;
    strategy: string;
    signal: SignalType;
    details: string;
    winRate?: string;
    result?: 'WIN' | 'LOSS';
    profit?: number;
    stake?: number;
    exitDigit?: number;
}

export type ContractType = 'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | 'CALL' | 'PUT' | 'ONETOUCH' | 'NOTOUCH';

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