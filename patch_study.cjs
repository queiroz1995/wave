const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// Change from 10 to 5 for initial tick collection to speed it up.
content = content.replace(
    /if \(lastDigits\.length < 10\) \{/g,
    `if (lastDigits.length < 5) {`
);

fs.writeFileSync('src/context/BotContext.tsx', content);

let screenContent = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');
screenContent = screenContent.replace(
    /if \(digits\.length < 15\) \{/g,
    `if (digits.length < 5) {`
);
fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', screenContent);
