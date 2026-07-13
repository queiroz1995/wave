const fs = require('fs');
let code = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

code = code.replace(
    /return JSON\.parse\(savedStateJSON\);/,
    "return { ...DEFAULTS, ...JSON.parse(savedStateJSON) };"
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', code);
