const fs = require('fs');

let content = fs.readFileSync('src/components/bot/RecentDigitsPanel.tsx', 'utf8');

// 1. Update imports
content = content.replace("import { Zap, BarChart3 } from 'lucide-react';", "import { Zap, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';");

// 2. Update context destructuring
content = content.replace(
    "const { lastDigits, currentLiveTick, asset } = useBotContext();",
    "const { lastDigits, currentLiveTick, asset, manualBuy, tradeStatus, digitTradeMode, digitPrediction, isConnected } = useBotContext();"
);

// 3. Add buttons
const buttonsHTML = `
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                        type="button"
                        onClick={() => manualBuy(digitTradeMode === 'overUnder' ? 'DIGITOVER' : 'DIGITEVEN', 'Entrada Manual')}
                        disabled={!isConnected || tradeStatus === 'ACTIVE' || tradeStatus === 'SENDING'}
                        className={cn(
                            "h-10 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            digitTradeMode === 'overUnder' 
                                ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        )}
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {digitTradeMode === 'overUnder' ? \`OVER \${digitPrediction}\` : 'PAR'}
                    </button>
                    <button
                        type="button"
                        onClick={() => manualBuy(digitTradeMode === 'overUnder' ? 'DIGITUNDER' : 'DIGITODD', 'Entrada Manual')}
                        disabled={!isConnected || tradeStatus === 'ACTIVE' || tradeStatus === 'SENDING'}
                        className={cn(
                            "h-10 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            digitTradeMode === 'overUnder' 
                                ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                        )}
                    >
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        {digitTradeMode === 'overUnder' ? \`UNDER \${digitPrediction}\` : 'ÍMPAR'}
                    </button>
                </div>
            </div>
        </div>
    );
};`;

content = content.replace(/            <\/div>\n        <\/div>\n    \);\n};/, buttonsHTML);

fs.writeFileSync('src/components/bot/RecentDigitsPanel.tsx', content);
