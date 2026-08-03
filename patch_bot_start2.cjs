const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

// Change default isBotRunning to false so it doesn't start automatically
content = content.replace(
    /const \[isBotRunning, setIsBotRunning\] = useState\(true\);/,
    `const [isBotRunning, setIsBotRunning] = useState(false);`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
