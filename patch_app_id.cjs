const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

// Change default to 1089
content = content.replace(/export const DEFAULT_DERIV_APP_ID = '36300';/, "export const DEFAULT_DERIV_APP_ID = '1089';");

// Remove the logic that prevents 1089
content = content.replace(/appId: !savedState\.appId \|\| savedState\.appId === '1089' \? DEFAULT_DERIV_APP_ID : savedState\.appId,/, "appId: !savedState.appId ? DEFAULT_DERIV_APP_ID : savedState.appId,");

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
