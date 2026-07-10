const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /isWaitingForVirtualResult\n    \]\);/;
content = content.replace(regex, `isWaitingForVirtualResult,
        accountType,
        currentLiveTick,
        isPumaConnected,
        ws,
        broker,
        pumabrokerToken,
        pumabrokerUserId
    ]);`);

fs.writeFileSync('src/context/BotContext.tsx', content);
