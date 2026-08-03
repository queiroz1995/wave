const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

content = content.replace(
    /reason: "Sincronizando dados\.\.\."/g,
    `reason: !isConnected ? "Aguardando Conexão..." : !isBotRunning ? "Pronto para Iniciar" : "Sincronizando dados..."`
);

fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
