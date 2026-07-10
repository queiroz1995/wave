const fs = require('fs');

const filesToUpdate = [
    'src/components/bot/TradeParameters.tsx',
    'src/components/bot/QuickConfigModal.tsx'
];

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
];`;

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const AVAILABLE_ASSETS = \[\s*\{[\s\S]*?\];/m, newAssetsArray);
    fs.writeFileSync(file, content);
});

