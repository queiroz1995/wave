const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

content = content.replace(
    /appId === '36300' \? DEFAULT_DERIV_APP_ID/g,
    `appId === '1089' ? DEFAULT_DERIV_APP_ID`
);

content = content.replace(
    /savedState\.appId === '36300'/g,
    `savedState.appId === '1089'`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
