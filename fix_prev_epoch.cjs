const fs = require('fs');

let code = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const restoreEffect = `
    useEffect(() => {
        if (!isConnected) return;
        if (tradeStatus === 'ACTIVE') {
            if (lastTickEpoch !== prevEpochRef.current) {
                prevEpochRef.current = lastTickEpoch;
                setActiveContractTick(prev => Math.min(duration, prev + 1));
            }
        } else {
            setActiveContractTick(0);
            prevEpochRef.current = null;
        }
    }, [lastTickEpoch, tradeStatus, duration, isConnected]);
`;

code = code.replace(
    /const prevEpochRef = useRef<number \| null>\(null\);\s*useEffect\(\(\) => \{/g,
    `const prevEpochRef = useRef<number | null>(null);\n${restoreEffect}\n    useEffect(() => {`
);

fs.writeFileSync('src/context/BotContext.tsx', code);
