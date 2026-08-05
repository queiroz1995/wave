const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', 'utf8');

content = content.replace(
    /const \{ multiMarketDigits \} = useBotContext\(\);\n    React\.useEffect\(\(\) => \{\n        console\.log\("MultiMarketDigits updated:", multiMarketDigits\);\n    \}, \[multiMarketDigits\]\);\n    const \{ multiMarketDigits, digitTradeMode, digitPrediction, overUnderDirection \} = useBotContext\(\);/,
    `const { multiMarketDigits, digitTradeMode, digitPrediction, overUnderDirection } = useBotContext();
    React.useEffect(() => {
        console.log("MultiMarketDigits updated:", Object.keys(multiMarketDigits || {}).length);
    }, [multiMarketDigits]);`
);

fs.writeFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', content);
