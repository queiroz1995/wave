const fs = require('fs');
const file = 'src/context/BotContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const calculatedDuration = Math\.max\(1, Math\.min\(10, Math\.floor\(Number\(duration\) \|\| 1\)\)\);/,
    "const minDuration = asset.startsWith('frx') ? 5 : 1;\n        const calculatedDuration = Math.max(minDuration, Math.min(10, Math.floor(Number(duration) || minDuration)));"
);

fs.writeFileSync(file, content);
