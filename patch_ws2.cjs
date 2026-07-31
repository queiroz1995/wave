const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

content = content.replace(
    /    return useMemo\(\(\) => \(\{\n        isConnected,\n        status,\n        connectWithToken,\n        disconnect,\n        sendMessage: useCallback\(\(payload: any\) => \{\n            if \(ws\.current\?\.readyState === WebSocket\.OPEN\) \{\n                ws\.current\.send\(JSON\.stringify\(payload\)\);\n            \}\n        \}, \[\]\),\n        wsRef: ws,\n    \}\), \[isConnected, status, connectWithToken, disconnect\]\);\n\};/,
    `    const sendMessage = useCallback((payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
        }
    }, []);

    return useMemo(() => ({
        isConnected,
        status,
        connectWithToken,
        disconnect,
        sendMessage,
        wsRef: ws,
    }), [isConnected, status, connectWithToken, disconnect, sendMessage]);
};`
);
fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', content);
