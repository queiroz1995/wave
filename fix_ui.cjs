const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

if (!content.includes('import { OperationLog }')) {
    content = content.replace("import { AIThoughtCard } from './AIThoughtCard';", "import { AIThoughtCard } from './AIThoughtCard';\nimport { OperationLog } from './OperationLog';");
}

if (!content.includes('<OperationLog />')) {
    content = content.replace('<OperationsFeed signals={signals} onReset={resetOperations} />', '<OperationsFeed signals={signals} onReset={resetOperations} />\n            <div className="h-64">\n                <OperationLog />\n            </div>');
}

fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
