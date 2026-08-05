const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /const prevEpochRef = useRef<number \| null>\(null\);/,
    `const prevEpochRef = useRef<number | null>(null);
    const subscribedMarketsRef = useRef<Set<string>>(new Set());`
);

content = content.replace(
    /useEffect\(\(\) => \{\s*setLastDigits\(\[\]\); setMultiMarketDigits\(\{\}\);\s*setCurrentLiveTick\(null\);\s*latestTickDigitRef\.current = null;\s*if \(isConnected && ws\.sendMessage\) \{[\s\S]*?\/\/ Não enviamos forget porque a Deriv gerencia assinaturas\s*\}\s*\}, \[asset, isConnected, addLog, ws\.sendMessage\]\);/,
    `useEffect(() => {
        setLastDigits([]); 
        // DO NOT clear setMultiMarketDigits({}) to preserve other markets during asset switch
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;

        if (isConnected && ws.sendMessage) {
            const ALL_MARKETS = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V', '1HZ150V', '1HZ250V', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'BEAR', 'BULL', 'BOOM300N', 'BOOM500', 'BOOM1000', 'CRASH300N', 'CRASH500', 'CRASH1000', 'JD10', 'JD25', 'JD50', 'JD75', 'JD100', 'STPRNG', 'RANGE100', 'RANGE200'];
            
            // Subscribe to main asset immediately if not already subscribed
            if (!subscribedMarketsRef.current.has(asset)) {
                addLog(\`[SISTEMA] Solicitando fluxo de dados de \${asset}...\`, "INFO");
                ws.sendMessage({ ticks: asset, subscribe: 1 });
                subscribedMarketsRef.current.add(asset);
            }

            // Slowly subscribe to others
            ALL_MARKETS.forEach((m, i) => {
                if (!subscribedMarketsRef.current.has(m)) {
                    setTimeout(() => {
                        if (ws.sendMessage) {
                            ws.sendMessage({ ticks: m, subscribe: 1 });
                            subscribedMarketsRef.current.add(m);
                        }
                    }, 500 + i * 200);
                }
            });
        }
    }, [asset, isConnected, addLog, ws.sendMessage]);
    
    // Clear subscriptions on disconnect
    useEffect(() => {
        if (!isConnected) {
            subscribedMarketsRef.current.clear();
        }
    }, [isConnected]);`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
