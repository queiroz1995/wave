const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

content = content.replace(
    /App ID público 36300/g,
    `App ID público 1089`
);

content = content.replace(
    /app_id=36300/g,
    `app_id=1089`
);

content = content.replace(
    /'36300', accountType\);/g,
    `'1089', accountType);`
);

content = content.replace(
    /cleanAppId !== '36300'/g,
    `cleanAppId !== '1089'`
);

fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', content);
