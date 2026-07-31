const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /\s*\/\/ === AUTO-GALE MANUAL \(Surfando a esticada\) ===[\s\S]*?(?=\/\/ Update statistics)/;

content = content.replace(regex, `
                // Update statistics`);

fs.writeFileSync('src/context/BotContext.tsx', content);
