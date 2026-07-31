const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AILandingPage.tsx', 'utf8');
content = content.replace(/Wave Intelligence v2\.4/g, 'Rico Intelligence v2.0');
fs.writeFileSync('src/components/bot/AILandingPage.tsx', content);
