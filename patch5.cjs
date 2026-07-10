const fs = require('fs');
const file = 'src/components/bot/GamePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const {/,
    "const {\n        asset,"
);

content = content.replace(
    /const signalText = currentSignal === 'DIGITEVEN' \? 'PAR' :/,
    `const isForex = asset?.startsWith('frx');
    const signalText = currentSignal === 'DIGITEVEN' ? (isForex ? 'SOBE' : 'PAR') :`
);
content = content.replace(
    /currentSignal === 'DIGITODD' \? 'ÍMPAR' :/,
    "currentSignal === 'DIGITODD' ? (isForex ? 'DESCE' : 'ÍMPAR') :"
);

content = content.replace(
    /<span>PAR<\/span>/,
    "<span>{isForex ? 'SOBE' : 'PAR'}</span>"
);
content = content.replace(
    /<span>ÍMPAR<\/span>/,
    "<span>{isForex ? 'DESCE' : 'ÍMPAR'}</span>"
);

fs.writeFileSync(file, content);
