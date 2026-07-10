const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(/        isPumaConnected,\n/g, '');

fs.writeFileSync('src/context/BotContext.tsx', content);
