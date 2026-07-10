const fs = require('fs');
let code = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

code = code.replace(
    /const fallbackSocket = new WebSocket\(\`wss:\/\/ws\.derivws\.com\/websockets\/v3\?app_id=1089\`\);/g,
    `const fallbackAppId = '1089';\n                        const fallbackSocket = new WebSocket(\`wss://ws.derivws.com/websockets/v3?app_id=\${fallbackAppId}\`);`
);

fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', code);
