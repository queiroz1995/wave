const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

const getInitialStateRegex = /const getInitialState = \(\) => \{[\s\S]*?\}\n\};/m;

const replacement = `const getInitialState = () => {
    try {
        const savedStateJSON = localStorage.getItem('derivBotState');
        if (!savedStateJSON) {
            return { ...DEFAULTS };
        }
        return JSON.parse(savedStateJSON);
    } catch (e) {
        return { ...DEFAULTS };
    }
};`;

content = content.replace(getInitialStateRegex, replacement);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
