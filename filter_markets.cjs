const fs = require('fs');

const MARKETS = [
    { value: '1HZ10V', label: 'Vol 10 (1s)' },
    { value: '1HZ25V', label: 'Vol 25 (1s)' },
    { value: '1HZ50V', label: 'Vol 50 (1s)' },
    { value: '1HZ75V', label: 'Vol 75 (1s)' },
    { value: '1HZ100V', label: 'Vol 100 (1s)' },
    { value: 'R_10', label: 'Vol 10' },
    { value: 'R_25', label: 'Vol 25' },
    { value: 'R_50', label: 'Vol 50' },
    { value: 'R_75', label: 'Vol 75' },
    { value: 'R_100', label: 'Vol 100' }
];

const valuesList = MARKETS.map(m => `'${m.value}'`).join(', ');

// --- Patch AllMarketsDigitsPanel.tsx ---
let panelContent = fs.readFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', 'utf8');

panelContent = panelContent.replace(
    /const MARKETS = \[\s*[\s\S]*?\s*\];/,
    `const MARKETS = ${JSON.stringify(MARKETS, null, 4)};`
);

fs.writeFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', panelContent);

// --- Patch BotContext.tsx ---
let contextContent = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

contextContent = contextContent.replace(
    /if \(\[.*?\]\.includes\(tickSymbol\)\) \{/,
    `if ([${valuesList}].includes(tickSymbol)) {`
);

contextContent = contextContent.replace(
    /const ALL_MARKETS = \[.*?\];/,
    `const ALL_MARKETS = [${valuesList}];`
);

fs.writeFileSync('src/context/BotContext.tsx', contextContent);

// --- Patch TradeParameters.tsx ---
let tradeParamsContent = fs.readFileSync('src/components/bot/TradeParameters.tsx', 'utf8');

const newAssetGroups = `const ASSET_GROUPS = [
    {
        label: "Índices Sintéticos (Volatility 1s)",
        options: [
            { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
            { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
            { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
            { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
            { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
        ]
    },
    {
        label: "Índices Sintéticos (Volatility)",
        options: [
            { value: 'R_10', label: 'Volatility 10 Index' },
            { value: 'R_25', label: 'Volatility 25 Index' },
            { value: 'R_50', label: 'Volatility 50 Index' },
            { value: 'R_75', label: 'Volatility 75 Index' },
            { value: 'R_100', label: 'Volatility 100 Index' },
        ]
    }
];`;

tradeParamsContent = tradeParamsContent.replace(
    /const ASSET_GROUPS = \[\s*[\s\S]*?\];\s*export const TradeParameters/,
    `${newAssetGroups}\n\nexport const TradeParameters`
);

fs.writeFileSync('src/components/bot/TradeParameters.tsx', tradeParamsContent);

