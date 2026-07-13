const fs = require('fs');
let code = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

code = code.replace(/const cleanToken = token\.trim\(\);/g, "const cleanToken = (token || '').trim();");
code = code.replace(/const cleanAppId = appId\.trim\(\)/g, "const cleanAppId = (appId || '').trim()");

fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', code);
