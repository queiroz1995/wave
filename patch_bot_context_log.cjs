const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(
    /if \(!subscribedMarketsRef\.current\.has\(m\)\) \{\s*setTimeout\(\(\) => \{\s*if \(ws\.sendMessage\) \{\s*ws\.sendMessage\(\{ ticks: m, subscribe: 1 \}\);\s*subscribedMarketsRef\.current\.add\(m\);\s*\}\s*\}, 500 \+ i \* 200\);\s*\}/g,
    `if (!subscribedMarketsRef.current.has(m)) {
                    setTimeout(() => {
                        if (ws.sendMessage) {
                            console.log("Subscribing to market for radar:", m);
                            ws.sendMessage({ ticks: m, subscribe: 1 });
                            subscribedMarketsRef.current.add(m);
                        }
                    }, 500 + i * 200);
                }`
);

fs.writeFileSync('src/context/BotContext.tsx', content);
