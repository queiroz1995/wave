const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

// Change default isBotRunning to true so it starts automatically
content = content.replace(
    /const \[isBotRunning, setIsBotRunning\] = useState\(false\);/,
    `const [isBotRunning, setIsBotRunning] = useState(true);`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
