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

    const marketSymbol = signal.asset || signal.symbol || signal.market || (signal.strategy && signal.strategy.match(/\(([^)]+)\)/)?.[1]);

    return (
        <div className={cn("flex items-start space-x-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-500 p-2 rounded-md border border-transparent hover:border-primary/30", background)}>
            <span className="text-primary/60 min-w-[60px]">{signal.timestamp}</span>
            <Icon className={cn('h-4 w-4 min-w-[16px] mt-px', color)} />
            <div className="flex-1 break-words text-foreground/90">
                {hasResult ? (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn("font-bold text-xs", config!.color)}>{config!.label}</span>
                            {marketSymbol && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    {marketSymbol}
                                </span>
                            )}
                            {signal.signal && (
                                <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700">
                                    {signal.signal}
                                </span>
                            )}
                            <span className={cn("font-black text-sm ml-auto", profitColor)}>
                                {profitSign}{typeof signal.profit === 'number' ? signal.profit.toFixed(2) : '0.00'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/90 mt-1">
                            <span>
                                Estratégia: <span className="font-semibold text-primary/80">{signal.strategy}</span>
                            </span>
                            {digitValue !== undefined && (
                                <span>
                                    Dígito: <span className={cn(
                                        "font-bold text-xs ml-0.5",
                                        Number(digitValue) === 0 ? 'text-blue-400' : (Number(digitValue) % 2 === 0 ? 'text-green-400' : 'text-red-400')
                                    )}>{digitValue}</span>
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {marketSymbol && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                {marketSymbol}
                            </span>
                        )}
                        {signal.signal && (
                            <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700">
                                {signal.signal}
                            </span>
                        )}
                        <span className="font-semibold text-yellow-400">Aguardando resultado...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignalItem;