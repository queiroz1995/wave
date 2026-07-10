const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const getExitDigitRegex = /    for \(const candidate of candidates\) {[\s\S]*?            if \(!isNaN\(lastDigit\)\) {[\s\S]*?                return lastDigit;[\s\S]*?            }[\s\S]*?        }[\s\S]*?    }/;

const newGetExitDigit = `    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null && candidate !== 'undefined' && candidate !== '') {
            const strVal = String(candidate).replace(/[^\\d]/g, '');
            const lastDigit = parseInt(strVal.slice(-1), 10);
            if (!isNaN(lastDigit)) {
                return lastDigit;
            }
        }
    }`;

content = content.replace(getExitDigitRegex, newGetExitDigit);

const activeContractDigitRegex = /                const currentSpot = currentSpotStr;[\s\S]*?                if \(currentSpot !== undefined && currentSpot !== null\) {[\s\S]*?                    const lastDigit = parseInt\(currentSpot\.toString\(\)\.slice\(-1\), 10\);[\s\S]*?                    if \(!isNaN\(lastDigit\)\) {[\s\S]*?                        setActiveContractDigit\(lastDigit\);[\s\S]*?                    }[\s\S]*?                }/;

const newActiveContractDigit = `                if (currentSpotStr !== 'undefined' && currentSpotStr !== '') {
                    const cleanStr = currentSpotStr.replace(/[^\\d]/g, '');
                    const lastDigit = parseInt(cleanStr.slice(-1), 10);
                    if (!isNaN(lastDigit)) {
                        setActiveContractDigit(lastDigit);
                    }
                }`;

content = content.replace(activeContractDigitRegex, newActiveContractDigit);

fs.writeFileSync('src/context/BotContext.tsx', content);
