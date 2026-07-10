const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /                const tickValue = data\.tick\?\.quote \?\? data\.tick\?\.display_value \?\? data\.tick\?\.tick;\n                const lastDigit = Number\(String\(tickValue\)\.replace\(\/\[\^\\d\]\/g, ''\)\.slice\(-1\)\);\n                const epoch = data\.tick\?\.epoch;/;

const replacement = `                const tickSymbol = data.tick?.symbol;
                const tickQuote = data.tick?.quote ?? data.tick?.tick;
                const pipSize = data.tick?.pip_size;
                let lastDigit = 0;
                
                if (tickQuote !== undefined && pipSize !== undefined) {
                    const fixedValue = Number(tickQuote).toFixed(pipSize);
                    lastDigit = Number(fixedValue.slice(-1));
                } else {
                    const tickValueStr = String(data.tick?.quote ?? data.tick?.display_value ?? data.tick?.tick);
                    lastDigit = Number(tickValueStr.replace(/[^\\d]/g, '').slice(-1));
                }
                const epoch = data.tick?.epoch;`;

content = content.replace(/                const tickSymbol = data\.tick\?\.symbol;\n                const tickValue = data\.tick\?\.quote \?\? data\.tick\?\.display_value \?\? data\.tick\?\.tick;\n                const lastDigit = Number\(String\(tickValue\)\.replace\(\/\[\^\\d\]\/g, ''\)\.slice\(-1\)\);\n                const epoch = data\.tick\?\.epoch;/, replacement);

fs.writeFileSync('src/context/BotContext.tsx', content);
