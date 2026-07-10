const fs = require('fs');
let content = fs.readFileSync('src/hooks/bot/useBotState.ts', 'utf8');

content = content.replace(
    /accountType: 'demo' as 'real' \| 'demo',/g,
    "accountType: 'demo' as 'real' | 'demo',\n    broker: 'deriv' as 'deriv' | 'pumabroker',\n    pumabrokerToken: '',\n    pumabrokerUserId: '',"
);

content = content.replace(
    /const \[accountType, setAccountType\] = useState<'real' \| 'demo'>\(initialState\.accountType\);/g,
    "const [accountType, setAccountType] = useState<'real' | 'demo'>(initialState.accountType);\n    const [broker, setBroker] = useState<'deriv' | 'pumabroker'>(initialState.broker || 'deriv');\n    const [pumabrokerToken, setPumabrokerToken] = useState(initialState.pumabrokerToken || '');\n    const [pumabrokerUserId, setPumabrokerUserId] = useState(initialState.pumabrokerUserId || '');"
);

content = content.replace(
    /return \{[\s\S]*?realToken,\s*setRealToken/m,
    `return {
        broker, setBroker,
        pumabrokerToken, setPumabrokerToken,
        pumabrokerUserId, setPumabrokerUserId,
        realToken, setRealToken`
);

fs.writeFileSync('src/hooks/bot/useBotState.ts', content);
