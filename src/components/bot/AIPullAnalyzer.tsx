import React, { useMemo } from 'react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Target, TrendingUp } from 'lucide-react';

export const AIPullAnalyzer = () => {
    const { lastDigits } = useBotContext();

    const pullAnalysis = useMemo(() => {
        const digits = lastDigits || [];
        if (digits.length < 50) return []; // Need sample size

        // We want to calculate: Given digit X appears, what is the probability the NEXT digit is Even or Odd?
        // Since lastDigits is ordered from newest (index 0) to oldest (index N-1),
        // if we are at index i+1 (current digit), the "next" digit that appeared after it is at index i.
        const stats = Array.from({ length: 10 }, () => ({ even: 0, odd: 0, total: 0 }));

        for (let i = 0; i < digits.length - 1; i++) {
            const nextAppearedDigit = digits[i];
            const currentDigit = digits[i + 1];

            stats[currentDigit].total++;
            if (nextAppearedDigit % 2 === 0) {
                stats[currentDigit].even++;
            } else {
                stats[currentDigit].odd++;
            }
        }

        const pulls = [];
        for (let d = 0; d < 10; d++) {
            const s = stats[d];
            if (s.total >= 3) { // Require at least 3 occurrences to show %
                const evenPct = (s.even / s.total) * 100;
                const oddPct = (s.odd / s.total) * 100;

                if (evenPct >= 90) {
                    pulls.push({ digit: d, color: 'VERDE', parity: 'PAR', pct: Math.round(evenPct), count: s.total });
                } else if (oddPct >= 90) {
                    pulls.push({ digit: d, color: 'VERMELHA', parity: 'ÍMPAR', pct: Math.round(oddPct), count: s.total });
                }
            }
        }

        return pulls.sort((a, b) => b.pct - a.pct);
    }, [lastDigits]);

    if (pullAnalysis.length === 0) {
        return null; // Don't show if there are no pulls > 90%
    }

    return (
        <div className="w-full bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group mb-3">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
            <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-purple-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            I.A. Detectou Puxadores (&gt;90%)
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {pullAnalysis.map((pull, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-2",
                                pull.parity === 'PAR' ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg font-mono text-sm font-black text-white",
                                    pull.parity === 'PAR' ? "bg-emerald-600" : "bg-rose-600"
                                )}>
                                    {pull.digit}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-wider",
                                        pull.parity === 'PAR' ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        Puxa {pull.parity}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-300">
                                        {pull.pct}%
                                    </span>
                                </div>
                            </div>
                            <TrendingUp className={cn(
                                "h-4 w-4 opacity-50",
                                pull.parity === 'PAR' ? "text-emerald-400" : "text-rose-400"
                            )} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
