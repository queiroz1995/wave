"use client";

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignalEntry } from '@/types/bot';

interface SignalItemProps {
    signal: SignalEntry;
}

const resultConfig = {
    WIN: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20', label: 'VITÓRIA' },
    LOSS: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20', label: 'DERROTA' },
};

const SignalItem: React.FC<SignalItemProps> = ({ signal }) => {
    const result = String(signal.result ?? signal.status ?? signal.outcome ?? '').toUpperCase();
    const hasResult = result === 'WIN' || result === 'LOSS';
    const config = hasResult ? resultConfig[result as keyof typeof resultConfig] : null;

    const Icon = hasResult ? config!.icon : Clock;
    const color = hasResult ? config!.color : 'text-yellow-400';
    const background = hasResult ? config!.bg : 'bg-muted/50';

    const profitColor = result === 'WIN' ? 'text-green-400' : result === 'LOSS' ? 'text-red-400' : 'text-yellow-400';
    const profitSign = typeof signal.profit === 'number' && signal.profit > 0 ? '+' : '';
    const digitValue = signal.exitDigit ?? signal.digit ?? signal.exit_digit ?? signal.finalDigit;

    return (
        <div className={cn("flex items-start space-x-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-500 p-2 rounded-md border border-transparent hover:border-primary/30", background)}>
            <span className="text-primary/60 min-w-[60px]">{signal.timestamp}</span>
            <Icon className={cn('h-4 w-4 min-w-[16px] mt-px', color)} />
            <div className="flex-1 break-words text-foreground/90">
                {hasResult ? (
                    <div className="flex flex-col">
                        <p className="font-bold text-sm">
                            <span className={cn("mr-2", config!.color)}>{config!.label}</span>
                            <span className={cn("font-extrabold", profitColor)}>
                                {profitSign}{typeof signal.profit === 'number' ? signal.profit.toFixed(2) : '0.00'}
                            </span>
                            {digitValue !== undefined && (
                                <span className="text-muted-foreground text-[10px] ml-1">
                                    (Dígito: <span className={cn(
                                        "font-bold",
                                        Number(digitValue) === 0 ? 'text-blue-400' : (Number(digitValue) % 2 === 0 ? 'text-green-400' : 'text-red-400')
                                    )}>{digitValue}</span>)
                                </span>
                            )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">
                            Estratégia: <span className="font-semibold text-primary/80">{signal.strategy}</span> | Stake: ${signal.stake?.toFixed(2) || 'N/A'}
                        </p>
                    </div>
                ) : (
                    <p className="font-semibold text-yellow-400">Aguardando resultado da operação...</p>
                )}
            </div>
        </div>
    );
};

export default SignalItem;