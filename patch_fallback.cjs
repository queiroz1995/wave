const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

content = content.replace(
    /app_id=1089/g,
    `app_id=36300`
);

content = content.replace(
    /App ID público 1089/g,
    `App ID público 36300`
);

content = content.replace(
    /cleanAppId !== '1089'/g,
    `cleanAppId !== '36300'`
);

content = content.replace(
    /'1089', accountType\);/g,
    `'36300', accountType);`
);

fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', content);
