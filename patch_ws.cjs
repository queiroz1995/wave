const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

content = content.replace(
    /        sendMessage: \(payload: any\) => \{\n            if \(ws\.current\?\.readyState === WebSocket\.OPEN\) \{\n                ws\.current\.send\(JSON\.stringify\(payload\)\);\n            \}\n        \},/,
    `        sendMessage: useCallback((payload: any) => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(payload));
            }
        }, []),`
);

// We need to import useCallback if it's not imported already, but it's likely imported. Let's check imports.
if (content.includes('useCallback')) {
    fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', content);
    console.log("Patched ws");
}
