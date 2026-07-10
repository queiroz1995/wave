const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// 1. Add pumabroker states to useBotContext return
content = content.replace(
    /const \{\s*accountType, setAccountType,/,
    "const {\n        broker, setBroker,\n        pumabrokerToken, setPumabrokerToken,\n        pumabrokerUserId, setPumabrokerUserId,\n        accountType, setAccountType,"
);

// 2. Inject states inside BotProvider
content = content.replace(
    /const \{\s*accountType, setAccountType,/,
    "const {\n        broker, setBroker,\n        pumabrokerToken, setPumabrokerToken,\n        pumabrokerUserId, setPumabrokerUserId,\n        accountType, setAccountType,"
);

// We must be careful replacing within BotProvider. Let's find exactly the useBotState() call.
const stateMatch = /const stateAndSetters = useBotState\(\);/m;
if (!stateMatch.test(content)) {
    // If it's decomposed:
    content = content.replace(
        /const \{\s*accountType, setAccountType,/g,
        "const {\n        broker, setBroker,\n        pumabrokerToken, setPumabrokerToken,\n        pumabrokerUserId, setPumabrokerUserId,\n        accountType, setAccountType,"
    );
}

// Update handleConnect to support PumaBroker
const connectReplacement = `
    const [isPumaConnected, setIsPumaConnected] = useState(false);
    const [pumaBalance, setPumaBalance] = useState(0);

    const handleConnect = useCallback(async () => {
        if (broker === 'pumabroker') {
            const token = pumabrokerToken.trim();
            const uId = pumabrokerUserId.trim();
            if (!token || !uId) {
                toast.error("User ID e Token são necessários para PumaBroker.");
                return;
            }
            setIsConnecting(true);
            addLog(\`[SISTEMA] Iniciando conexão PumaBroker (User \${uId})...\`, "INFO");
            try {
                const res = await fetch(\`/pumabroker-api/api/v1/users/\${uId}\`, {
                    headers: { 'Authorization': \`Bearer \${token}\`, 'Accept': 'application/json' }
                });
                if (!res.ok) throw new Error("Erro na autenticação da PumaBroker.");
                const data = await res.json();
                setPumaBalance(accountType === 'real' ? data.balance : data.demoBalance);
                setAccountId(data.id);
                setIsPumaConnected(true);
                addLog(\`[SISTEMA] PumaBroker conectada. Saldo: \${accountType === 'real' ? data.balance : data.demoBalance}\`, "SUCCESS");
                toast.success("Conectado à PumaBroker!");
                
                // Conectar websocket da Deriv para cotações usando um token demo ou app_id apenas
                if (demoToken.trim()) {
                    ws.connectWithToken(demoToken.trim(), appId.trim() || DEFAULT_DERIV_APP_ID, 'demo');
                }
            } catch (err: any) {
                toast.error("Falha ao conectar à PumaBroker");
                addLog(\`[SISTEMA] Erro PumaBroker: \${err.message}\`, "ERROR");
            } finally {
                setIsConnecting(false);
            }
            return;
        }

        const token = (accountType === 'real' ? realToken : demoToken).trim();
        const usedAppId = appId.trim() || DEFAULT_DERIV_APP_ID;

        if (!token) {
            toast.error("Token não encontrado. Por favor, insira seu Token PAT.");
            return;
        }

        addLog(\`[SISTEMA] Iniciando conexão \${accountType.toUpperCase()} com App ID \${usedAppId}...\`, "INFO");
        ws.connectWithToken(token, usedAppId, accountType);
    }, [broker, pumabrokerToken, pumabrokerUserId, accountType, realToken, demoToken, appId, ws, addLog]);
`;

content = content.replace(/const handleConnect = useCallback\(\(\) => \{[\s\S]*?ws\.connectWithToken\(token, usedAppId, accountType\);\n    \}, \[.*?\]\);/m, connectReplacement);

// Update executeBuy for PumaBroker
const executeBuyReplacement = `
    const executeBuy = useCallback(async (contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake?: number) => {
        if (broker === 'pumabroker') {
            if (!isPumaConnected) {
                toast.error("Conecte-se para operar na PumaBroker.");
                return { success: false, isVirtual: false };
            }
            if (isTradeInProgressRef.current) return { success: false, isVirtual: false };
            
            const stake = overrideStake || parseFloat(currentStake);
            const entryPrice = currentLiveTick || 0;
            const pumabrokerDirection = (contractType === 'CALL' || contractType === 'DIGITOVER') ? 'CALL' : 'PUT';

            isTradeInProgressRef.current = true;
            addLog(\`[\${strategyName}] Enviando Ordem PumaBroker: \${pumabrokerDirection} \${symbol} | Stake: \${stake}\`, "INFO");
            setTradeStatus('PROCESSING');

            try {
                const res = await fetch('/pumabroker-api/api/v1/trades', {
                    method: 'POST',
                    headers: { 
                        'Authorization': \`Bearer \${pumabrokerToken.trim()}\`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        userId: pumabrokerUserId.trim(),
                        symbol: symbol,
                        direction: pumabrokerDirection,
                        amount: stake,
                        duration: duration,
                        entryPrice: entryPrice,
                        verify: "gAAAAABqTa15Zm8h8JSkY3dxqpCI1y_3H6sr5BaUQcPiszm8Z3TCLcC_00hJj5y5LwZ25WTWrZ7z2ZymXU0k2jdKG-XHlS5Cub1n6_ETThjpsRhXG1q2aQo=",
                        wallet: accountType === 'real' ? 'REAL' : 'DEMO',
                        timeframe: 'M1',
                        mode: 'CANDLE_TIME',
                        payout: 0.85
                    })
                });

                if (!res.ok) throw new Error("Falha ao registrar trade na PumaBroker");
                const data = await res.json();
                
                toast.success(\`Ordem executada na PumaBroker!\`);
                addLog(\`[\${strategyName}] Trade Aberto PumaBroker\`, "SUCCESS");
                setTradeStatus('OPEN');
                
                // Simula o fechamento do trade baseado na duração (em segundos)
                setTimeout(() => {
                    setTradeStatus('IDLE');
                    isTradeInProgressRef.current = false;
                    addLog(\`[\${strategyName}] Trade PumaBroker finalizado (Simulado localmente)\`, "INFO");
                }, duration * 1000);

            } catch (err: any) {
                toast.error(err.message);
                addLog(\`[SISTEMA] Erro Order PumaBroker: \${err.message}\`, "ERROR");
                setTradeStatus('IDLE');
                isTradeInProgressRef.current = false;
            }
            return { success: true, isVirtual: false };
        }

        // --- Deriv Logic Below ---
        if (!ws.isConnected) {
            toast.error("Conecte-se para operar.");
            return { success: false, isVirtual: false };
        }
`;

content = content.replace(/const executeBuy = useCallback\(\(contractType: ContractType, strategyName: string, signalId: string, symbol: string, overrideStake\?: number\) => \{\n        if \(!ws\.isConnected\) \{[\s\S]*?toast\.error\("Conecte-se para operar\."\);\n            return \{ success: false, isVirtual: false \};\n        \}/m, executeBuyReplacement);

// Override exposed isConnected and balance
content = content.replace(
    /return \(\n\s*<BotContext\.Provider value=\{\{/m,
    `
    const isActuallyConnected = broker === 'pumabroker' ? isPumaConnected : ws.isConnected;
    const actualBalance = broker === 'pumabroker' ? pumaBalance : ws.balance;

    return (
        <BotContext.Provider value={{`
);

content = content.replace(
    /isConnected:\s*ws\.isConnected,/g,
    "isConnected: isActuallyConnected,"
);
content = content.replace(
    /accountBalance:\s*ws\.balance,/g,
    "accountBalance: actualBalance,"
);

fs.writeFileSync('src/context/BotContext.tsx', content);
