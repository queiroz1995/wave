const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

if (!content.includes('import { OperationLog }')) {
    content = content.replace('import { AIThoughtCard } from "./AIThoughtCard";', 'import { AIThoughtCard } from "./AIThoughtCard";\nimport { OperationLog } from "./OperationLog";');
    fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
}
