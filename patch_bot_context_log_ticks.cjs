const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /if \(\['1HZ10V',/g,
    `// console.log("Received tick for", tickSymbol, lastDigit);
                if (['1HZ10V',`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
