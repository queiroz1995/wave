const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useTradingWebSocketManager.ts', 'utf8');

content = content.replace(
    /errorCode === 'AppIdInvalid' \|\| errorCode === 'InvalidAppId' \|\| errorCode === 'InvalidRedirectUrl' \|\| errorCode === 'InvalidOrigin'/,
    "errorCode === 'AppIdInvalid' || errorCode === 'InvalidAppId' || errorCode === 'InvalidRedirectUrl' || errorCode === 'InvalidOrigin' || errorCode === 'InvalidToken'"
);

fs.writeFileSync('src/hooks/bot/useTradingWebSocketManager.ts', content);
