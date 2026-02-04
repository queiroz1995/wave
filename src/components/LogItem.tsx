"use client";

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogEntry, LogType } from '@/types/bot';

interface LogItemProps {
    log: LogEntry;
}

interface LogConfig {
    icon: React.ElementType;
    color: string;
    bg: string;
}

const logTypeConfig: Record<LogType, LogConfig> = {
    WIN: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    LOSS: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    ERROR: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    TRADE: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
};

const LogItem: React.FC<LogItemProps> = ({ log }) => {
    const config = logTypeConfig[log.type] || logTypeConfig.INFO;
    const Icon = config.icon;

    const isTradeResult = log.type === 'WIN' || log.type === 'LOSS';
    const isTradeInitiation = log.type === 'TRADE';
    const profitColor = log.profit && log.profit > 0 ? 'text-green-500' : 'text-red-500';
    const profitSign = log.profit && log.profit >= 0 ? '+' : '';

    const cleanMessage = log.message.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ').trim();

    const formatContractType = (type?: string) => {
        if (!type) return '';
        switch (type) {
            case 'DIGITODD': return 'Ímpar';
            case 'DIGITEVEN': return 'Par';
            case 'DIGITOVER': return 'Acima';
            case 'DIGITUNDER': return 'Abaixo';
            default: return type;
        }
    };

    return (
        <div className={cn(
            "flex items-start space-x-2 text-[11px] font-mono p-1.5 rounded-sm transition-colors border border-transparent hover:border-border/50",
            config.bg
        )}>
            <div className="flex-shrink-0 mt-0.5">
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-h-[16px]">
                    <span className="text-muted-foreground/70 text-[10px] min-w-[55px] font-mono flex-shrink-0">
                        {log.timestamp}
                    </span>
                    
                    {isTradeResult ? (
                        <div className="flex flex-col">
                            <p className="font-bold text-sm">
                                <span className={cn("mr-2", config!.color)}>{log.type === 'WIN' ? 'VITÓRIA' : 'DERROTA'}</span>
                                <span className={cn("font-extrabold", profitColor)}>
                                    {profitSign}{log.profit?.toFixed(2)}
                                </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1">
                                {log.strategyName && (
                                    <>Estratégia: <span className="font-semibold text-primary/80">{log.strategyName}</span></>
                                )}
                            </p>
                        </div>
                    ) : (
                        <p className="text-foreground/90 truncate whitespace-nowrap text-[11px]" title={cleanMessage}>
                            {cleanMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogItem;