const fs = require('fs');
let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

code = code.replace(/const token = \(accountType === 'real' \? realToken : demoToken\)\.trim\(\);/g, "const token = ((accountType === 'real' ? realToken : demoToken) || '').trim();");
code = code.replace(/const usedAppId = appId\.trim\(\) \|\| DEFAULT_DERIV_APP_ID;/g, "const usedAppId = (appId || '').trim() || DEFAULT_DERIV_APP_ID;");

fs.writeFileSync('src/context/BotContext.tsx', code);
