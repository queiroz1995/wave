const fs = require('fs');
const file = 'src/components/bot/ManualSignalPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const { initialStake, setInitialStake } = useBotContext\(\);/,
    "const { initialStake, setInitialStake, asset } = useBotContext();\n    const isForex = asset?.startsWith('frx');"
);

content = content.replace(
    /PAR/,
    "{isForex ? 'SOBE' : 'PAR'}"
);
content = content.replace(
    /ÍMPAR/,
    "{isForex ? 'DESCE' : 'ÍMPAR'}"
);

fs.writeFileSync(file, content);
