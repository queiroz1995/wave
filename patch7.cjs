const fs = require('fs');
const file = 'src/context/BotContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /contractToSignal\(tracked\.contractType\)/g,
    "contractToSignal(tracked.contractType, asset.startsWith('frx'))"
);

content = content.replace(
    /contractToSignal\(contractType\)/g,
    "contractToSignal(contractType, asset?.startsWith('frx'))"
);

fs.writeFileSync(file, content);
