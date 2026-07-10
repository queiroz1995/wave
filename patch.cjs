const fs = require('fs');
const file = 'src/context/BotContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const getProposalContractType = \([\s\S]*?\): ContractType => \{[\s\S]*?    \}[\s\S]*?    return requestedType;\n\};/,
    `const getProposalContractType = (
    requestedType: ContractType,
    digitTradeMode: 'evenOdd' | 'overUnder' | 'riseFall' | 'multimodal',
    overUnderDirection: 'OVER' | 'UNDER',
    asset: string
): ContractType => {
    const isForex = asset.startsWith('frx');
    if (requestedType === 'DIGITEVEN' || requestedType === 'DIGITODD') {
        if (isForex || digitTradeMode === 'riseFall') {
            return requestedType === 'DIGITEVEN' ? 'CALL' : 'PUT';
        }
        if (digitTradeMode === 'overUnder') {
            return overUnderDirection === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
        }
    }
    return requestedType;
};`
);

content = content.replace(
    /const proposalContractType = getProposalContractType\(contractType, digitTradeMode, overUnderDirection\);/,
    "const proposalContractType = getProposalContractType(contractType, digitTradeMode, overUnderDirection, asset);"
);

fs.writeFileSync(file, content);
