const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// The incorrect sed was:
// s/isWaitingForVirtualResult/isWaitingForVirtualResult,\n        accountType,\n        currentLiveTick,\n        isPumaConnected,\n        ws,\n        broker,\n        pumabrokerToken,\n        pumabrokerUserId/g
// I will replace that specific block back to `isWaitingForVirtualResult` everywhere, except in the `executeBuy` dependency array.

const brokenBlock = `isWaitingForVirtualResult,
        accountType,
        currentLiveTick,
        isPumaConnected,
        ws,
        broker,
        pumabrokerToken,
        pumabrokerUserId`;

content = content.replace(new RegExp(brokenBlock, 'g'), "isWaitingForVirtualResult");

fs.writeFileSync('src/context/BotContext.tsx', content);
