const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const replacement = `    const isActuallyConnected = broker === 'pumabroker' ? isPumaConnected : isConnected;

    const contextValue = useMemo(() => ({
        ...stateAndSetters,
        accountBalance: broker === 'pumabroker' ? pumaBalance : stateAndSetters.accountBalance,
        isConnected: isActuallyConnected,`;

content = content.replace(/const contextValue = useMemo\(\(\) => \(\{\n\s*\.\.\.stateAndSetters,\n\s*isConnected,/, replacement);

// Replace dependencies
content = content.replace(/setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual\]\);/, "setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, broker, isPumaConnected, pumaBalance, isActuallyConnected]);");

// Also there was an issue where handleDisconnect was badly updated. Let's fix handleDisconnect.
const handleDisconnectReplacement = `    const handleDisconnect = useCallback(() => {
        if (broker === 'pumabroker') {
            setIsPumaConnected(false);
            setPumaBalance(0);
            addLog("[SISTEMA] PumaBroker Desconectada pelo usuário", "INFO");
            ws.disconnect(); // Disconnect deriv guest if connected
            return;
        }
        ws.disconnect();
        addLog("[SISTEMA] Desconectado pelo usuário", "INFO");
    }, [broker, ws, addLog]);`;

content = content.replace(/const handleDisconnect = useCallback\(\(\) => \{[\s\S]*?\}, \[ws\.disconnect, addLog\]\);/, handleDisconnectReplacement);

// Fix missing dependency in useMemo:
// React Hook useMemo has missing dependencies: 'setLosses', 'setTotalProfit', 'setTradeStatus', and 'setWins'
content = content.replace(/setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, broker, isPumaConnected, pumaBalance, isActuallyConnected\]\);/, "setVirtualLossStreak, setIsWaitingForVirtualResult, setIsWaitingForRecoveryVirtual, broker, isPumaConnected, pumaBalance, isActuallyConnected, setLosses, setTotalProfit, setTradeStatus, setWins]);");

// Ensure ws.disconnect is used in context if we overrode handleDisconnect
content = content.replace(/handleDisconnect: ws\.disconnect,/, "handleDisconnect,");


fs.writeFileSync('src/context/BotContext.tsx', content);
