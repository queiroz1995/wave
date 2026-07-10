const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');
content = content.replace('let mean = entropySample.reduce((a, b) => a + b, 0) / entropySample.length;', 'const mean = entropySample.reduce((a, b) => a + b, 0) / entropySample.length;');
fs.writeFileSync('src/context/BotContext.tsx', content);
