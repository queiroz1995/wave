const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /const handleDisconnect = useCallback\(\(\) => \{[\s\S]*?\}, \[broker, ws, addLog\]\);/,
    `const handleDisconnect = useCallback(() => {
        if (broker === 'pumabroker') {
            setIsPumaConnected(false);
            setPumaBalance(0);
            addLog("[SISTEMA] PumaBroker Desconectada pelo usuário", "INFO");
            ws.disconnect(); // Disconnect deriv guest if connected
            return;
        }
        ws.disconnect();
        addLog("[SISTEMA] Desconectado pelo usuário", "INFO");
    }, [broker, ws, addLog]);`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
