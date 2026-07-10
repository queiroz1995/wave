const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// 1. handleConnect
content = content.replace(/    const handleConnect = useCallback\(async \(\) => \{[\s\S]*?ws\.connectWithToken\(token, usedAppId, accountType\);\n    \}, \[.*\]\);/,
`    const handleConnect = useCallback(async () => {
        const token = (accountType === 'real' ? realToken : demoToken).trim();
        const usedAppId = appId.trim() || DEFAULT_DERIV_APP_ID;

        if (!token) {
            toast.error("Token não encontrado. Por favor, insira seu Token PAT.");
            return;
        }

        addLog("[SISTEMA] Iniciando conexão Deriv...", "INFO");
        ws.connectWithToken(token, usedAppId, accountType);
    }, [accountType, realToken, demoToken, appId, ws, addLog, setAccountId]);`);


// 2. executeBuy
// Find executeBuy = useCallback(async (contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake?: number) => { ...
// and remove the pumaBroker part.
content = content.replace(/        if \(broker === 'pumabroker'\) \{[\s\S]*?return \{ success: true, isVirtual: false \};\n        \}\n\n        const token/,
`        const token`);

// 3. handleDisconnect
content = content.replace(/    const handleDisconnect = useCallback\(\(\) => \{[\s\S]*?\}, \[broker, ws, addLog\]\);/,
`    const handleDisconnect = useCallback(() => {
        ws.disconnect();
        addLog("[SISTEMA] Desconectado pelo usuário", "INFO");
    }, [ws, addLog]);`);

// 4. Other variables
content = content.replace(/    const isActuallyConnected = broker === 'pumabroker' \? isPumaConnected : isConnected;\n/, '');
content = content.replace(/        accountBalance: broker === 'pumabroker' \? pumaBalance : stateAndSetters\.accountBalance,\n/, '        accountBalance: stateAndSetters.accountBalance,\n');
content = content.replace(/        isConnected: isActuallyConnected,\n/, '        isConnected,\n');

// 5. contextValue dependencies
content = content.replace(/broker, isPumaConnected, pumaBalance, isActuallyConnected, /g, '');


fs.writeFileSync('src/context/BotContext.tsx', content);
