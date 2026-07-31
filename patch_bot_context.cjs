const fs = require('fs');

let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// 1. Update Map types
content = content.replace(
    /const proposalTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number }>>\(new Map\(\)\);/,
    "const proposalTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number, baseStake: number }>>(new Map());"
);

content = content.replace(
    /const buyTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number }>>\(new Map\(\)\);/,
    "const buyTracker = useRef<Map<number, { strategyName: string, signalId: string, stake: number, contractType: ContractType, tradeCycleId: number, baseStake: number }>>(new Map());"
);

// 2. Update proposalTracker.current.set
content = content.replace(
    /proposalTracker\.current\.set\(reqId, { strategyName, signalId, stake, contractType, tradeCycleId }\);/,
    "proposalTracker.current.set(reqId, { strategyName, signalId, stake, contractType, tradeCycleId, baseStake });"
);

fs.writeFileSync('src/context/BotContext.tsx', content);
