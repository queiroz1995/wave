const fs = require('fs');

let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

// The tick handling block to inject:
const tickHandlingBlock = `
        if (data?.msg_type === 'tick') {
            const tickSymbol = data.tick?.symbol;
            const tickQuote = data.tick?.quote ?? data.tick?.tick;
            const pipSize = data.tick?.pip_size;
            let lastDigit = 0;
            
            if (tickQuote !== undefined && pipSize !== undefined) {
                const fixedValue = Number(tickQuote).toFixed(pipSize);
                lastDigit = Number(fixedValue.slice(-1));
            } else {
                const tickValueStr = String(data.tick?.quote ?? data.tick?.display_value ?? data.tick?.tick);
                lastDigit = Number(tickValueStr.replace(/[^\\d]/g, '').slice(-1));
            }

            const epoch = data.tick?.epoch;

            if (Number.isFinite(lastDigit) && tickSymbol === asset) {
                setCurrentLiveTick(lastDigit);
                latestTickDigitRef.current = lastDigit;
                setLastTickEpoch(epoch);
                setLastDigits(prev => {
                    return [lastDigit, ...prev].slice(0, 500);
                });

                // Processamento de Simulação de Trade Virtual Local (Contador Regressivo de Ticks)
                if (activeVirtualTradeRef.current) {
                    activeVirtualTradeRef.current.ticksRemaining--;
                    
                    if (activeVirtualTradeRef.current.ticksRemaining <= 0) {
                        const virtualTrade = activeVirtualTradeRef.current;
                        const exitDigit = lastDigit;
                        const isEven = exitDigit % 2 === 0;
                        let isWin = false;

                        if (virtualTrade.prediction === 'DIGITEVEN') isWin = isEven;
                        else if (virtualTrade.prediction === 'DIGITODD') isWin = !isEven;
                        else if (virtualTrade.prediction === 'DIGITOVER') isWin = exitDigit > digitPrediction;
                        else if (virtualTrade.prediction === 'DIGITUNDER') isWin = exitDigit < digitPrediction;

                        const result = isWin ? 'WIN' : 'LOSS';

                        addLog(
                            \`[VIRTUAL] \${result === 'WIN' ? 'Vitória Virtual' : 'Perda Virtual'} (Dígito: \${exitDigit})\`,
                            result,
                            { isVirtual: true, strategyName: virtualTrade.strategyName, contractType: virtualTrade.prediction, exitDigit }
                        );

                        if (isWin) {
                            setVirtualLossStreak(0);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;
                            updateSignalResult(virtualTrade.signalId, 'WIN', 0.35, 0.35, exitDigit);
                        } else {
                            const nextStreak = virtualLossStreakRef.current + 1;
                            setVirtualLossStreak(nextStreak);
                            setIsWaitingForVirtualResult(false);
                            activeVirtualTradeRef.current = null;
                            updateSignalResult(virtualTrade.signalId, 'LOSS', -0.35, 0.35, exitDigit);
                        }
                    }
                }
            }
        }
`;

// Inject into handleWebSocketMessage
code = code.replace(
    /if \(data\?\.msg_type === 'proposal'\) \{/g,
    `${tickHandlingBlock}\n        if (data?.msg_type === 'proposal') {`
);

// Delete the old useEffect and replace it
const oldEffectStart = code.indexOf('useEffect(() => {', code.indexOf('// Monitoramento de Ticks em Tempo Real'));
const oldEffectEnd = code.indexOf('    const handleConnect = useCallback(async () => {');

if (oldEffectStart !== -1 && oldEffectEnd !== -1) {
    const before = code.substring(0, oldEffectStart);
    const after = code.substring(oldEffectEnd);

    const newEffect = `    useEffect(() => {
        if (!isConnected) {
            setLastDigits([]);
            setCurrentLiveTick(null);
            latestTickDigitRef.current = null;
            return;
        }

        setLastDigits([]);
        setCurrentLiveTick(null);
        latestTickDigitRef.current = null;

        addLog(\`[SISTEMA] Sincronizando fluxo de dados em tempo real para \${asset}...\`, "INFO");
        
        sendMessageRef.current({ forget_all: 'ticks' });
        sendMessageRef.current({ ticks: asset, subscribe: 1 });

        return () => {
            sendMessageRef.current({ forget_all: 'ticks' });
        };
    }, [asset, isConnected, addLog, setLastTickEpoch, setLastDigits, digitPrediction, setVirtualLossStreak, setIsWaitingForVirtualResult, updateSignalResult]);

`;
    code = before + newEffect + after;
} else {
    console.log("Could not find the useEffect boundaries!");
}

fs.writeFileSync('src/context/BotContext.tsx', code);
