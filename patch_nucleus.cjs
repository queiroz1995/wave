const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AILandingPage.tsx', 'utf8');
content = content.replace(/NÚCLEO WAVE/g, 'NÚCLEO RICO');
fs.writeFileSync('src/components/bot/AILandingPage.tsx', content);
