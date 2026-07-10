const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

// DEFAULTS
content = content.replace(/    broker: 'deriv' as 'deriv' \| 'pumabroker',\n/g, '');
content = content.replace(/    pumabrokerToken: '',\n/g, '');
content = content.replace(/    pumabrokerUserId: '',\n/g, '');

// useState
content = content.replace(/    const \[broker, setBroker\] = useState<'deriv' \| 'pumabroker'>\(initialState\.broker \|\| 'deriv'\);\n/g, '');
content = content.replace(/    const \[pumabrokerToken, setPumabrokerToken\] = useState\(initialState\.pumabrokerToken \|\| ''\);\n/g, '');
content = content.replace(/    const \[pumabrokerUserId, setPumabrokerUserId\] = useState\(initialState\.pumabrokerUserId \|\| ''\);\n/g, '');

// return
content = content.replace(/        broker, setBroker,\n/g, '');
content = content.replace(/        pumabrokerToken, setPumabrokerToken,\n/g, '');
content = content.replace(/        pumabrokerUserId, setPumabrokerUserId,\n/g, '');

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);

let content2 = fs.readFileSync('src/hooks/bot/useBotPersistence.ts', 'utf8');
content2 = content2.replace(/        broker, pumabrokerToken, pumabrokerUserId,\n/g, '');
fs.writeFileSync('src/hooks/bot/useBotPersistence.ts', content2);
