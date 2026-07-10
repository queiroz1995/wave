const fs = require('fs');
let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

code = code.replace(
    /socket\.onmessage = \(event\) => \{/g,
    `socket.onerror = (error) => {\n            if (publicWsRef.current !== socket) return;\n            addLog("[ERRO] Falha no WebSocket de Ticks Públicos.", "ERROR");\n        };\n        socket.onclose = (event) => {\n            if (publicWsRef.current !== socket) return;\n            addLog(\`[SISTEMA] WebSocket de Ticks fechado: \${event.code} \${event.reason}\`, "ERROR");\n        };\n        socket.onmessage = (event) => {`
);

code = code.replace(
    /const wsUrl = \`wss:\/\/ws\.derivws\.com\/websockets\/v3\?app_id=1089\`;/g,
    `const fallbackAppId = appId.trim() && !isNaN(Number(appId.trim())) ? appId.trim() : '1089';\n        const wsUrl = \`wss://ws.derivws.com/websockets/v3?app_id=\${fallbackAppId}\`;`
);

fs.writeFileSync('src/context/BotContext.tsx', code);
