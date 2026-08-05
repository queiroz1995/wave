const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /500 \+ i \* 200/g,
    `1000 + i * 500`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
