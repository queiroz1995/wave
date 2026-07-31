const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

content = content.replace(
    /export const DEFAULT_DERIV_APP_ID = '33yxEj8JnVc9XRyM6aB2n';/,
    `export const DEFAULT_DERIV_APP_ID = '36300';`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
