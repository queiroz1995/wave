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
    const hasNumericProfit = typeof log.profit === 'number' && Number.isFinite(log.profit);
    const displayedProfit = hasNumericProfit ? log.profit : 0;

    const profitColor = log.isVirtual
        ? 'text-cyan-400'
        : !hasNumericProfit
            ? 'text-muted-foreground'
            : displayedProfit > 0
                ? 'text-green-500'
                : displayedProfit < 0
                    ? 'text-red-500'
                    : 'text-amber-400';

    const profitSign = hasNumericProfit && displayedProfit > 0 ? '+' : '';

    // Limpa quebras de linha e espaços múltiplos da mensagem para garantir que seja uma linha única
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
            log.isVirtual ? "bg-cyan-500/5 border-cyan-500/10" : config.bg
        )}>
            <div className="flex-shrink-0 mt-0.5">
                <Icon className={cn('h-3.5 w-3.5', log.isVirtual ? 'text-cyan-400' : config.color)} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-h-[16px]">
                    <span className="text-muted-foreground/70 text-[10px] min-w-[55px] font-mono flex-shrink-0">
                        {log.timestamp}
                    </span>
                    
                    {isTradeResult ? (
                        <div className="flex flex-col">
                            <p className="font-bold text-sm">
                                <span className={cn("mr-2", log.isVirtual ? "text-cyan-400" : config.color)}>
                                    {log.isVirtual 
                                        ? (log.type === 'WIN' ? 'VITÓRIA VIRTUAL' : 'DERROTA VIRTUAL') 
                                        : (log.type === 'WIN' ? 'VITÓRIA' : 'DERROTA')}
                                </span>
                                <span className={cn("font-extrabold", profitColor)}>
                                    {log.isVirtual ? 'DEMO' : `${profitSign}${displayedProfit.toFixed(2)}`}
                                </span>
                                {log.exitDigit !== undefined && (
                                    <span className="text-muted-foreground text-[10px] ml-1">
                                        (Dígito: <span className={cn(
                                            "font-bold",
                                            log.exitDigit === 0 ? 'text-blue-400' : (log.exitDigit % 2 === 0 ? 'text-green-400' : 'text-red-400')
                                        )}>{log.exitDigit}</span>)
                                    </span>
                                )}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1">
                                {log.strategyName && (
                                    <>Estratégia: <span className="font-semibold text-primary/80">{log.strategyName}</span></>
                                )}
                                {(log.contractType || log.barrier !== undefined) && (
                                    <span className="ml-1">
                                        | Contrato: <span className="font-semibold text-primary/80">{formatContractType(log.contractType)}</span>
                                        {log.barrier !== undefined && ` (Barreira: ${log.barrier})`}
                                    </span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <p className={cn("truncate whitespace-nowrap text-[11px]", log.isVirtual ? "text-cyan-300/90" : "text-foreground/90")} title={cleanMessage}>
                            {cleanMessage}
                        </p>
                    )}
                </div>
                
                {/* Exibe detalhes de trade não-resultado em uma linha separada, se existirem */}
                {isTradeInitiation && (log.stake !== undefined || log.strategyName || log.contractType) && (
                    <div className="flex gap-2 text-[10px] mt-0.5 pl-0.5 text-muted-foreground">
                        {log.isVirtual && <span className="text-cyan-400 font-bold">[VIRTUAL]</span>}
                        {log.stake !== undefined && (
                            <span className="whitespace-nowrap">
                                Stake: <span className="font-mono">${log.stake.toFixed(2)}</span>
                            </span>
                        )}
                        {log.strategyName && (
                            <span className="truncate whitespace-nowrap">
                                Estratégia: {log.strategyName}
                            </span>
                        )}
                        {log.contractType && (
                            <span className="whitespace-nowrap">
                                Contrato: {formatContractType(log.contractType)}
                                {log.barrier !== undefined && ` (Barreira: ${log.barrier})`}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogItem;