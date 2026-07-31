const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AILandingPage.tsx', 'utf8');
content = content.replace(/Rico Intelligence v2.0/g, 'Wave Intelligence v2.4');
fs.writeFileSync('src/components/bot/AILandingPage.tsx', content);
