const fs = require('fs');

const MARKETS = [
    { value: '1HZ10V', label: 'Vol 10 (1s)' },
    { value: '1HZ25V', label: 'Vol 25 (1s)' },
    { value: '1HZ50V', label: 'Vol 50 (1s)' },
    { value: '1HZ75V', label: 'Vol 75 (1s)' },
    { value: '1HZ100V', label: 'Vol 100 (1s)' },
    { value: '1HZ150V', label: 'Vol 150 (1s)' },
    { value: '1HZ250V', label: 'Vol 250 (1s)' },
    { value: 'R_10', label: 'Vol 10' },
    { value: 'R_25', label: 'Vol 25' },
    { value: 'R_50', label: 'Vol 50' },
    { value: 'R_75', label: 'Vol 75' },
    { value: 'R_100', label: 'Vol 100' },
    { value: 'BEAR', label: 'Bear Market' },
    { value: 'BULL', label: 'Bull Market' },
    { value: 'BOOM300N', label: 'Boom 300' },
    { value: 'BOOM500', label: 'Boom 500' },
    { value: 'BOOM1000', label: 'Boom 1000' },
    { value: 'CRASH300N', label: 'Crash 300' },
    { value: 'CRASH500', label: 'Crash 500' },
    { value: 'CRASH1000', label: 'Crash 1000' },
    { value: 'JD10', label: 'Jump 10' },
    { value: 'JD25', label: 'Jump 25' },
    { value: 'JD50', label: 'Jump 50' },
    { value: 'JD75', label: 'Jump 75' },
    { value: 'JD100', label: 'Jump 100' },
    { value: 'STPRNG', label: 'Step Index' },
    { value: 'RANGE100', label: 'Range 100' },
    { value: 'RANGE200', label: 'Range 200' },
    { value: 'frxAUDJPY', label: 'AUD/JPY' },
    { value: 'frxAUDUSD', label: 'AUD/USD' },
    { value: 'frxEURAUD', label: 'EUR/AUD' },
    { value: 'frxEURCAD', label: 'EUR/CAD' },
    { value: 'frxEURCHF', label: 'EUR/CHF' },
    { value: 'frxEURGBP', label: 'EUR/GBP' },
    { value: 'frxEURJPY', label: 'EUR/JPY' },
    { value: 'frxEURUSD', label: 'EUR/USD' },
    { value: 'frxGBPAUD', label: 'GBP/AUD' },
    { value: 'frxGBPJPY', label: 'GBP/JPY' },
    { value: 'frxGBPUSD', label: 'GBP/USD' },
    { value: 'frxUSDCAD', label: 'USD/CAD' },
    { value: 'frxUSDCHF', label: 'USD/CHF' },
    { value: 'frxUSDJPY', label: 'USD/JPY' },
    { value: 'cryBTCUSD', label: 'BTC/USD' },
    { value: 'cryETHUSD', label: 'ETH/USD' },
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

