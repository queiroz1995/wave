const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /                \/\/ === AUTO-GALE MANUAL \(Surfando a esticada\) ===[\s\S]*?martingaleLevel\.current = 0;\n                    \}\n                \}/;

content = content.replace(regex, "");

fs.writeFileSync('src/context/BotContext.tsx', content);
