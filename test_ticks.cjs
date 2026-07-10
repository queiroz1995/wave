const fs = require('fs');
let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// Replace the effect that creates publicWsRef
const oldEffect = /useEffect\(\(\) => \{[^]*?if \(!isConnected\) \{[^]*?setLastDigits\(\[\]\);[^]*?const fallbackAppId =[^]*?publicWsRef\.current = socket;[^]*?socket\.onopen =[^]*?socket\.onerror =[^]*?socket\.onclose =[^]*?socket\.onmessage = \(event\) => \{[^]*?\}\);[^]*?\}\s*\}\s*\};\s*return \(\) => \{[^]*?if \(socket\) \{[^]*?socket\.close\(\);[^]*?\}[^]*?\};\s*\}, \[asset, isConnected, addLog, setLastTickEpoch, setLastDigits, digitPrediction, setVirtualLossStreak, setIsWaitingForVirtualResult, updateSignalResult\]\);/g;

// Find the match
const match = code.match(oldEffect);
if (match) {
    console.log("Matched the effect!");
} else {
    console.log("Did not match the effect.");
}
