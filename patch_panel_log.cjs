const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', 'utf8');

content = content.replace(
    /export const AllMarketsDigitsPanel = \(\) => \{/,
    `export const AllMarketsDigitsPanel = () => {
    const { multiMarketDigits } = useBotContext();
    React.useEffect(() => {
        console.log("MultiMarketDigits updated:", multiMarketDigits);
    }, [multiMarketDigits]);`
);

fs.writeFileSync('src/components/bot/AllMarketsDigitsPanel.tsx', content);
