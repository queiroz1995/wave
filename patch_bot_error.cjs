const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /if \(data\?\.error\) \{\s*const errorMessage = data\.error\?\.message \|\| "A Deriv recusou a operação\.";\s*handleRejectedTrade\(errorMessage\);\s*\}/,
    `if (data?.error) {
            const errorCode = data.error?.code;
            if (errorCode === 'AlreadySubscribed' || errorCode === 'InvalidSymbol' || errorCode === 'RateLimit') {
                console.warn("Ignorando erro de tick não-crítico:", data.error.message);
                return;
            }
            const errorMessage = data.error?.message || "A Deriv recusou a operação.";
            handleRejectedTrade(errorMessage);
        }`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
