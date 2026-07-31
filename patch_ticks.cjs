const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /        if \(isConnected && sendMessageRef\.current\) \{\n            addLog\(`\[SISTEMA\] Solicitando fluxo de dados de \$\{asset\}\.\.\.`, "INFO"\);\n            sendMessageRef\.current\(\{ ticks: asset, subscribe: 1 \}\);\n            \/\/ Não enviamos forget porque a Deriv gerencia assinaturas\n        \}/,
    `        if (isConnected && ws.sendMessage) {
            addLog(\`[SISTEMA] Solicitando fluxo de dados de \${asset}...\`, "INFO");
            ws.sendMessage({ ticks: asset, subscribe: 1 });
            // Não enviamos forget porque a Deriv gerencia assinaturas
        }`
);

// Add ws.sendMessage to dependency array of this effect
content = content.replace(
    /    \}, \[asset, isConnected, addLog\]\);/,
    `    }, [asset, isConnected, addLog, ws.sendMessage]);`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
