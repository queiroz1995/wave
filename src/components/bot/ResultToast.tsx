"use client";

import React from 'react';
import { Trophy, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultToastProps {
    result: 'WIN' | 'LOSS';
    profit: number;
    strategyName?: string;
}

export const ResultToast: React.FC<ResultToastProps> = ({ result, profit, strategyName }) => {
    const isWin = result === 'WIN';
    const Icon = isWin ? Trophy : ShieldAlert;
    const title = isWin ? 'VITÓRIA!' : 'DERROTA';
    const amount = isWin ? `+ $${profit.toFixed(2)}` : `- $${Math.abs(profit).toFixed(2)}`;

    return (
        <div className="flex items-center gap-4 w-full">
            <Icon className={cn('h-10 w-10 flex-shrink-0', isWin ? 'text-green-400' : 'text-red-400')} />
            <div className="flex-grow">
                <p className={cn('text-lg font-bold', isWin ? 'text-green-400' : 'text-red-400')}>{title}</p>
                <p className="text-2xl font-extrabold text-foreground">{amount}</p>
                {strategyName && <p className="text-xs text-muted-foreground mt-1">Estratégia: {strategyName}</p>}
            </div>
        </div>
    );
};