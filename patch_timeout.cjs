const fs = require('fs');
const content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');
const search = "return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;";
const replace = `    useEffect(() => {
        if (tradeStatus !== 'IDLE') {
            const timer = setTimeout(() => {
                if (isTradeInProgressRef.current || tradeStatus !== 'IDLE') {
                    addLog("[TIMEOUT] A corretora não respondeu a tempo. Reiniciando status...", "ERROR");
                    clearPendingTradeState();
                    isTradeInProgressRef.current = false;
                }
            }, 60000); // 60s timeout de segurança
            return () => clearTimeout(timer);
        }
    }, [tradeStatus, addLog, clearPendingTradeState]);

    return <BotContext.Provider value={contextValue}>{children}</BotContext.Provider>;`;
const patched = content.replace(search, replace);
fs.writeFileSync('src/context/BotContext.tsx', patched);
