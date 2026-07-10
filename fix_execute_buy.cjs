const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /        if \(broker === 'pumabroker'\) \{[\s\S]*?return \{ success: true, isVirtual: false \};\n        \}\n\n        const token/g;
content = content.replace(regex, '        const token');

fs.writeFileSync('src/context/BotContext.tsx', content);
