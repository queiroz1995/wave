const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

content = content.replace(
    /appId === '1089'/g,
    `appId === '36300'`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
