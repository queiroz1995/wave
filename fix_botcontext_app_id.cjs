const fs = require('fs');
let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

code = code.replace(
    /appId, setAccountId, duration, takeProfit, stopLoss, totalProfit,/,
    "appId, setAppId, setAccountId, duration, takeProfit, stopLoss, totalProfit,"
);

code = code.replace(
    /toggleBot: \(\) => setIsBotRunning\(!isBotRunning\),/,
    "appId, setAppId, toggleBot: () => setIsBotRunning(!isBotRunning),"
);

fs.writeFileSync('src/context/BotContext.tsx', code);
