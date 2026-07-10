const fs = require('fs');
const file = 'src/context/BotContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const contractToSignal = \(contractType: ContractType\) => \{/,
    "const contractToSignal = (contractType: ContractType, isForex?: boolean) => {\n    if (isForex) {\n        if (contractType === 'DIGITEVEN') return 'CALL';\n        if (contractType === 'DIGITODD') return 'PUT';\n    }"
);

content = content.replace(
    /signal: contractToSignal\(contractType\),/g,
    "signal: contractToSignal(contractType, asset.startsWith('frx')),"
);

content = content.replace(
    /signal: contractToSignal\(saved\.contractType\),/,
    "signal: contractToSignal(saved.contractType, asset.startsWith('frx')),"
);

fs.writeFileSync(file, content);
