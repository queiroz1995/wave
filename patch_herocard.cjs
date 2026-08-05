const fs = require('fs');

let content = fs.readFileSync('src/components/bot/AIOperatingHeroCard.tsx', 'utf8');
content = content.replace(/children: React\.ReactNode;/, '');
content = content.replace(/, children/g, '');
content = content.replace(/\{children\}/g, '');
fs.writeFileSync('src/components/bot/AIOperatingHeroCard.tsx', content);
