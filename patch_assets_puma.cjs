const fs = require('fs');
let content = fs.readFileSync('src/components/bot/TradeParameters.tsx', 'utf8');

const newAssetsArray = `const AVAILABLE_ASSETS = [
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'R_10', label: 'Volatility 10 Index' },
    { value: 'R_25', label: 'Volatility 25 Index' },
    { value: 'R_50', label: 'Volatility 50 Index' },
    { value: 'R_75', label: 'Volatility 75 Index' },
    { value: 'R_100', label: 'Volatility 100 Index' },
    { value: 'AUDUSD', label: 'AUD/USD (Puma)' },
    { value: 'EURUSD', label: 'EUR/USD (Puma)' },
    { value: 'GBPUSD', label: 'GBP/USD (Puma)' },
    { value: 'USDJPY', label: 'USD/JPY (Puma)' },
    { value: 'USDCAD', label: 'USD/CAD (Puma)' },
    { value: 'USDCHF', label: 'USD/CHF (Puma)' },
    { value: 'BTCUSD', label: 'BTC/USD (Puma)' },
    { value: 'XAUUSD', label: 'XAU/USD (Puma)' },
    { value: 'XAGUSD', label: 'XAG/USD (Puma)' }
];`;

content = content.replace(/const AVAILABLE_ASSETS = \[\s*\{[\s\S]*?\];/m, newAssetsArray);
fs.writeFileSync('src/components/bot/TradeParameters.tsx', content);

let qcContent = fs.readFileSync('src/components/bot/QuickConfigModal.tsx', 'utf8');
qcContent = qcContent.replace(/const AVAILABLE_ASSETS = \[\s*\{[\s\S]*?\];/m, newAssetsArray);
fs.writeFileSync('src/components/bot/QuickConfigModal.tsx', qcContent);

