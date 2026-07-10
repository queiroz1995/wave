const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /accountType, realToken, demoToken,/,
    "broker, pumabrokerToken, pumabrokerUserId, accountType, realToken, demoToken,"
);

fs.writeFileSync('src/context/BotContext.tsx', content);
