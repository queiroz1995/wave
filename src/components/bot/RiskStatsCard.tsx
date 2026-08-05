import React from 'react';
import { Card } from '@/components/ui/card';
import { useBotContext } from '@/context/BotContext';
import { AlertTriangle, TrendingDown, ShieldAlert, DollarSign } from 'lucide-react';

export const RiskStatsCard = () => {
    const { maxDrawdown, maxRecoveryStake, maxConsecutiveLosses, currency } = useBotContext();

    return (
        <Card className="p-4 space-y-4 bg-black/40 border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-medium text-white/90">Estatísticas de Risco</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Maior Drawdown</span>
                    </div>
                    <div className="text-xl font-bold text-red-100">
                        {maxDrawdown < 0 ? `-$${Math.abs(maxDrawdown).toFixed(2)}` : '$0.00'}
                    </div>
                    <div className="text-[10px] text-red-300/70 mt-1">
                        Menor saldo atingido
                    </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Stake Máxima</span>
                    </div>
                    <div className="text-xl font-bold text-orange-100">
                        ${maxRecoveryStake > 0 ? maxRecoveryStake.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-[10px] text-orange-300/70 mt-1">
                        Usada para recuperar
                    </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 col-span-2">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Máx. Loss Consecutivos</span>
                    </div>
                    <div className="text-xl font-bold text-yellow-100">
                        {maxConsecutiveLosses} {maxConsecutiveLosses === 1 ? 'Loss' : 'Losses'}
                    </div>
                    <div className="text-[10px] text-yellow-300/70 mt-1">
                        Sequência mais arriscada
                    </div>
                </div>
            </div>
        </Card>
    );
};
