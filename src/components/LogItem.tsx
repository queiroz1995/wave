"use client";

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogEntry, LogType, ContractType } from '@/types/bot';

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

const formatContractType = (type?: ContractType) => {
    if (!type) return '';
    switch (type) {
        case 'DIGITODD': return 'Ímpar';
        case 'DIGITEVEN': return 'Par';
        case 'DIGITOVER': return 'Acima';
        case 'DIGITUNDER': return 'Abaixo';
        case 'DIGITMATCH': return 'Número';
        default: return type;
    }
};

const getDigitParity = (digit: number) => {
    if (digit === 0) return 'Par (0)';
    return digit % 2 === 0 ? 'Par' : 'Ímpar';
};

const LogItem: React.FC<LogItemProps> = ({ log }) => {
    const config = logTypeConfig[log.type] || logTypeConfig.INFO;
    const Icon = config.icon;

    const isTradeResult = log.type === 'WIN' || log.type === 'LOSS';
    const profitColor = log.profit && log.profit > 0 ? 'text-green-500' : 'text-red-500';
    const profitSign = log.profit && log.profit >= 0 ? '+' : '';

    const cleanMessage = log.message.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ').trim();

    return (
        <div className={cn(
            "flex items-start space-x-2 text-[11px] font-mono p-1.5 rounded-sm transition-colors border border-transparent hover:border-border/50",
            config.bg
        )}>
            <div className="flex-shrink-0 mt-0.5">
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex flex-col min-h-[16px]">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/70 text-[10px] min-w-[55px] font-mono flex-shrink-0">
                            {log.timestamp}
                        </span>
                        
                        {isTradeResult ? (
                            <p className="font-bold text-sm">
                                <span className={cn("mr-2", config!.color)}>{log.type === 'WIN' ? 'VITÓRIA' : 'DERROTA'}</span>
                                <span className={cn("font-extrabold", profitColor)}>
                                    {profitSign}{log.profit?.toFixed(2)}
                                </span>
                            </p>
                        ) : (
                            <p className="text-foreground/90 truncate whitespace-nowrap text-[11px]" title={cleanMessage}>
                                {cleanMessage}
                            </p>
                        )}
                    </div>
                    
                    {isTradeResult && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                            {log.contractType && (
                                <>Aposta: <span className="font-semibold text-primary/80">{formatContractType(log.contractType)}</span></>
                            )}
                            {log.contractType === 'DIGITMATCH' && log.barrier !== undefined && (
                                <span className="ml-2">Alvo: <span className="font-semibold text-primary/80">{log.barrier}</span></span>
                            )}
                            {log.exitDigit !== undefined && (
                                <span className="ml-2">
                                    Resultado: <span className="font-semibold text-primary/80">{log.exitDigit}</span>
                                    {log.contractType === 'DIGITEVEN' || log.contractType === 'DIGITODD' ? ` (${getDigitParity(log.exitDigit)})` : ''}
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogItem;