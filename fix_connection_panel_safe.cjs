const fs = require('fs');
let code = fs.readFileSync('src/components/bot/ConnectionPanel.tsx', 'utf8');

code = code.replace(
    /currentToken\.trim\(\)/g,
    "(currentToken || '').trim()"
);

fs.writeFileSync('src/components/bot/ConnectionPanel.tsx', code);
