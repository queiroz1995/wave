const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex1 = /                const currentSpot = contract\.current_spot_display_value \|\| contract\.current_spot;/;
const replacement1 = `                const currentSpotStr = String(contract.current_spot_display_value ?? contract.current_spot);
                const currentSpot = currentSpotStr;`;

content = content.replace(regex1, replacement1);

const regex2 = /    const candidates = \[[\s\S]*?    \];/;
const replacement2 = `    const candidates = [
        contract.exit_tick_display_value,
        contract.exit_tick?.tick_display_value,
        contract.exit_spot_display_value,
        contract.current_spot_display_value,
    ].filter(c => c !== undefined && c !== null).map(String);
    if (candidates.length === 0) {
        candidates.push(String(contract.exit_spot ?? contract.current_spot));
    }`;

content = content.replace(regex2, replacement2);

fs.writeFileSync('src/context/BotContext.tsx', content);
