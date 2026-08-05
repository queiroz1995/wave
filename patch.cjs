const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');
content = content.replace(
    /<RecentDigitsPanel \/>\s*<AIPullAnalyzer \/>/g,
    `{/* <RecentDigitsPanel />
            <AIPullAnalyzer /> */}`
);
fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
