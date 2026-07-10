const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

content = content.replace(/        broker, pumabrokerToken, pumabrokerUserId, accountType, realToken, demoToken,\n/g, '        accountType, realToken, demoToken,\n');

content = content.replace(/    const \[isPumaConnected, setIsPumaConnected\] = useState\(false\);\n/g, '');
content = content.replace(/    const \[pumaBalance, setPumaBalance\] = useState\(0\);\n/g, '');

content = content.replace(/        broker,\n/g, '');
content = content.replace(/        pumabrokerToken,\n/g, '');
content = content.replace(/        pumabrokerUserId\n/g, '');


fs.writeFileSync('src/context/BotContext.tsx', content);
