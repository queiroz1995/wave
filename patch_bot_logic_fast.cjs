const fs = require('fs');

const content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /\/\/ --- SISTEMA QUÂNTICO SUPER AVANÇADO ---[\s\S]*?stateAndSetters\.digitPrediction\n    \]\);/m;

const replacement = `// --- SISTEMA QUÂNTICO SUPER AVANÇADO ---
        // 1. Amostragem de Dados
        const window60 = lastDigits.slice(0, 60);
        const window30 = lastDigits.slice(0, 30);
        const window15 = lastDigits.slice(0, 15);
        const window5 = lastDigits.slice(0, 5);

        // 2. Volatilidade e Médias Móveis (SMA / Desvio Padrão)
        const mean30 = window30.reduce((a, b) => a + b, 0) / 30;
        const variance30 = window30.reduce((a, b) => a + Math.pow(b - mean30, 2), 0) / 30;
        const stdDev30 = Math.sqrt(variance30);

        // 3. Entropia Quântica (Medição de Caos)
        const counts = new Array(10).fill(0);
        window60.forEach(d => counts[d]++);
        let entropy = 0;
        for (const count of counts) {
            if (count > 0) {
                const p = count / window60.length;
                entropy -= p * Math.log2(p);
            }
        }

        // Filtro Anti-Manipulação Institucional relaxado para permitir mais entradas
        const isConsecutiveAnomaly = lastDigits[0] === lastDigits[1] && lastDigits[1] === lastDigits[2] && lastDigits[2] === lastDigits[3] && lastDigits[3] === lastDigits[4];
        if (isConsecutiveAnomaly || entropy > 3.4 || stdDev30 < 0.8) {
            setIsManipulationDetected(true);
            setAiThought("⚠️ Anomalia Quântica Extrema. Mercado paralisado. Protegendo capital...");
            setCurrentConfidence(0);
            return;
        } else {
            setIsManipulationDetected(false);
        }

        // 4. Confluência e Escoragem (Modo Agressivo)
        let contractType: ContractType | null = null;
        let confidence = 0;
        let reason = "";
        let thought = "";

        if (digitTradeMode === 'overUnder') {
            const pred = Number(stateAndSetters.digitPrediction) || 4;
            
            let overScore = 0;
            let underScore = 0;

            // Indicador 1: Trend de Curto Prazo (SMA 5) mais sensível
            const mean5 = window5.reduce((a, b) => a + b, 0) / 5;
            if (mean5 > pred + 0.5) overScore += 30;
            if (mean5 < pred - 0.5) underScore += 30;

            // Indicador 2: Pressão Histórica (Volume/Frequência) mais permissiva
            const freqOver = window30.filter(d => d > pred).length / 30;
            const freqUnder = window30.filter(d => d < pred).length / 30;
            if (freqOver > 0.5) overScore += 35;
            if (freqUnder > 0.5) underScore += 35;

            // Indicador 3: Reversão à Média (Bollinger Bands mais justa)
            if (lastDigits[0] > mean30 + stdDev30 * 1.2) {
                underScore += 45; // Forte repulsão para baixo
            }
            if (lastDigits[0] < mean30 - stdDev30 * 1.2) {
                overScore += 45; // Forte repulsão para cima
            }

            const maxScore = Math.max(overScore, underScore);
            
            if (overScore >= 55) { // Threshold reduzido de 65 para 55
                contractType = 'DIGITOVER';
                confidence = Math.min(99, overScore + 25);
                reason = \`Aceleração Quântica OVER: (Score: \${overScore}).\`;
                thought = \`Alta Frequência: Breakout detectado. SMA5: \${mean5.toFixed(1)}\`;
            } else if (underScore >= 55) {
                contractType = 'DIGITUNDER';
                confidence = Math.min(99, underScore + 25);
                reason = \`Aceleração Quântica UNDER: (Score: \${underScore}).\`;
                thought = \`Alta Frequência: Breakdown detectado. SMA5: \${mean5.toFixed(1)}\`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(\`⚡ Modo Turbo: Analisando fluxo O/U (O: \${overScore} / U: \${underScore})\`);
            }

        } else {
            // MODO PAR / ÍMPAR (Even / Odd)
            let evenScore = 0;
            let oddScore = 0;

            // Indicador 1: Cadeias de Markov (Previsão de Transição de Estado)
            let evensAfterEven = 0, oddsAfterEven = 0;
            let evensAfterOdd = 0, oddsAfterOdd = 0;
            
            for (let i = 1; i < 30; i++) {
                const currentIsEven = lastDigits[i - 1] % 2 === 0;
                const prevIsEven = lastDigits[i] % 2 === 0;
                
                if (prevIsEven) {
                    if (currentIsEven) evensAfterEven++;
                    else oddsAfterEven++;
                } else {
                    if (currentIsEven) evensAfterOdd++;
                    else oddsAfterOdd++;
                }
            }

            const lastIsEven = lastDigits[0] % 2 === 0;
            let probEven = 50, probOdd = 50;

            if (lastIsEven) {
                const total = evensAfterEven + oddsAfterEven;
                if (total > 0) {
                    probEven = (evensAfterEven / total) * 100;
                    probOdd = (oddsAfterEven / total) * 100;
                }
            } else {
                const total = evensAfterOdd + oddsAfterOdd;
                if (total > 0) {
                    probEven = (evensAfterOdd / total) * 100;
                    probOdd = (oddsAfterOdd / total) * 100;
                }
            }

            if (probEven > 55) evenScore += 30; // Threshold mais fácil
            if (probOdd > 55) oddScore += 30;

            // Indicador 2: Exaustão de Sequência (Streaks Históricas)
            let currentStreak = 1;
            for (let i = 1; i < window30.length; i++) {
                if ((window30[i] % 2 === 0) === lastIsEven) currentStreak++;
                else break;
            }

            const getWindowMaxStreak = (windowDigits, isEven) => {
                let max = 0, current = 0;
                for (let i = windowDigits.length - 1; i >= 0; i--) {
                    if ((windowDigits[i] % 2 === 0) === isEven) {
                        current++;
                        if (current > max) max = current;
                    } else current = 0;
                }
                return max;
            };

            const maxEven30 = getWindowMaxStreak(window30, true);
            const maxOdd30 = getWindowMaxStreak(window30, false);
            
            const limit = lastIsEven ? maxEven30 : maxOdd30;

            // Antecipa a exaustão para entrar mais rápido (limit - 2 em vez de limit - 1)
            if (currentStreak >= Math.max(2, limit - 2)) {
                if (lastIsEven) oddScore += 50;
                else evenScore += 50;
            }

            // Indicador 3: Viés de Volume Sensível
            const evensIn15 = window15.filter(d => d % 2 === 0).length;
            if (evensIn15 > 8) evenScore += 20;
            else if (evensIn15 < 7) oddScore += 20;

            // Indicador 4: Quebra Estrutural Quântica
            if (mean30 > 4.5 && lastIsEven) oddScore += 15;
            if (mean30 < 4.5 && !lastIsEven) evenScore += 15;

            const maxScore = Math.max(evenScore, oddScore);

            if (evenScore >= 55) {
                contractType = 'DIGITEVEN';
                confidence = Math.min(99, evenScore + 25);
                reason = \`Disparo PAR: Score Agressivo (\${evenScore}).\`;
                thought = \`Aceleração Neural: Gatilho de alta frequência acionado para PAR. Markov: \${probEven.toFixed(0)}%\`;
            } else if (oddScore >= 55) {
                contractType = 'DIGITODD';
                confidence = Math.min(99, oddScore + 25);
                reason = \`Disparo ÍMPAR: Score Agressivo (\${oddScore}).\`;
                thought = \`Aceleração Neural: Gatilho de alta frequência acionado para ÍMPAR. Markov: \${probOdd.toFixed(0)}%\`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(\`⚡ Modo Turbo: Analisando distorções P/I (P: \${evenScore} / I: \${oddScore})\`);
            }
        }

        const minConfidence = Math.min(50, Number(stateAndSetters.marketStabilityThreshold) || 50); // Reduzido min de 55 pra 50
        
        if (contractType && confidence >= minConfidence) {
            setCurrentConfidence(confidence);
            const signalId = \`auto-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;
            const result = executeBuy(contractType, 'Módulo Super Quântico', signalId, asset);

            if (result && result.success) {
                lastAutoTradeEpochRef.current = lastTickEpoch;
                addSignal({
                    id: signalId,
                    strategy: result.isVirtual ? 'VIRTUAL: Módulo Super Quântico Turbo' : 'Módulo Super Quântico Turbo',
                    signal: contractToSignal(contractType),
                    details: reason,
                    winRate: \`\${confidence}%\`
                });
                setAiThought(thought);
            }
        }
    }, [
        isBotRunning,
        isConnected,
        tradeStatus,
        isPaused,
        lastDigits,
        lastTickEpoch,
        asset,
        addSignal,
        executeBuy,
        setCurrentConfidence,
        setIsManipulationDetected,
        stateAndSetters.marketStabilityThreshold,
        isWaitingForVirtualResult,
        digitTradeMode,
        stateAndSetters.digitPrediction
    ]);`;

if (regex.test(content)) {
    const updated = content.replace(regex, replacement);
    fs.writeFileSync('src/context/BotContext.tsx', updated);
    console.log("Success");
} else {
    console.log("Regex not found");
}
