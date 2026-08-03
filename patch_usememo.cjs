const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

content = content.replace(
    /\}, \[lastDigits\]\);/g,
    `}, [lastDigits, isConnected, isBotRunning]);`
);

fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
