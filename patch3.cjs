const fs = require('fs');
const file = 'src/context/BotContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /        overUnderDirection,/,
    "        overUnderDirection,\n        asset,"
);

fs.writeFileSync(file, content);
