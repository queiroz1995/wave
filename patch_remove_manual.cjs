const fs = require('fs');

// --- Patch AIOperatingScreen.tsx ---
let screenContent = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

// Remove imports
screenContent = screenContent.replace(/import \{ ManualSignalPanel \} from "\.\/ManualSignalPanel";\n/, '');
screenContent = screenContent.replace(/import \{ ManualStakeDialog \} from "\.\/ManualStakeDialog";\n/, '');

// Remove states
screenContent = screenContent.replace(/\s*const \[isManualStakeDialogOpen, setIsManualStakeDialogOpen\] = useState\(false\);\n/, '\n');
screenContent = screenContent.replace(/\s*const \[manualStakeValue, setManualStakeValue\] = useState\(initialStake\);\n/, '\n');
screenContent = screenContent.replace(/\s*const \[showManualConfirm, setShowManualConfirm\] = useState\(\(\) => \{[\s\S]*?\}\, \[showManualConfirm\]\);\n/, '\n');
screenContent = screenContent.replace(/\s*const \[pendingContractType, setPendingContractType\] = useState<ContractType \| null>\(null\);\n/, '\n');

// Remove useEffects for manualStakeValue
screenContent = screenContent.replace(/\s*useEffect\(\(\) => \{[\s\S]*?setManualStakeValue\(initialStake\);[\s\S]*?\}\, \[initialStake\]\);\n/, '\n');

// Remove handleManualClick
screenContent = screenContent.replace(/\s*const handleManualClick = \([\s\S]*?\}\;\n\n/g, '\n');
screenContent = screenContent.replace(/\s*const confirmManualBuy = \([\s\S]*?\}\;\n/g, '\n');

// Remove from JSX
screenContent = screenContent.replace(/<ManualSignalPanel[\s\S]*?\/>\n\s*/, '');
screenContent = screenContent.replace(/<ManualStakeDialog[\s\S]*?\/>\n\s*/, '');

fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', screenContent);

// --- Patch TradeParameters.tsx ---
let tradeParamsContent = fs.readFileSync('src/components/bot/TradeParameters.tsx', 'utf8');

tradeParamsContent = tradeParamsContent.replace(/isManualMode, setIsManualMode,/, '');
tradeParamsContent = tradeParamsContent.replace(/<div className="space-y-3 pt-4 border-t">[\s\S]*?<\/div>\s*<\/CardContent>/, '</CardContent>');

// Remove Switch import if unused? Let's just remove the block
fs.writeFileSync('src/components/bot/TradeParameters.tsx', tradeParamsContent);
