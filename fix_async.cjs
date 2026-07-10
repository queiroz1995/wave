const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');
content = content.replace(/const executeBuy = useCallback\(async \(contractType: ContractType, /g, 'const executeBuy = useCallback((contractType: ContractType, ');
fs.writeFileSync('src/context/BotContext.tsx', content);
