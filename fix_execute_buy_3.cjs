const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const startStr = "if (broker === 'pumabroker') {";
const endStr = "// --- Deriv Logic Below ---\n        if (!ws.isConnected) {";

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + "if (!ws.isConnected) {" + content.slice(endIdx + endStr.length);
    fs.writeFileSync('src/context/BotContext.tsx', content);
    console.log("Replaced!");
} else {
    console.log("Not found.");
}
