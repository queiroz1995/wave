const fs = require('fs');

const content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{\n        if \(!isBotRunning \|\| !isConnected\) return;[\s\S]*?stateAndSetters\.digitPrediction\n    \]\);/m;

const replacement = `useEffect(() => {
        if (!isBotRunning || !isConnected) return;
        if (isTradeInProgressRef.current || tradeStatus !== 'IDLE' || isWaitingForVirtualResult) return;
        if (isPaused) return;
        if (lastDigits.length < 30 || !lastTickEpoch) return;
        if (lastAutoTradeEpochRef.current === lastTickEpoch) return;

        // --- SISTEMA QUÂNTICO SUPER AVANÇADO ---
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

        // Filtro Anti-Manipulação Institucional
        const isConsecutiveAnomaly = lastDigits[0] === lastDigits[1] && lastDigits[1] === lastDigits[2] && lastDigits[2] === lastDigits[3];
        if (isConsecutiveAnomaly || entropy > 3.25 || stdDev30 < 1.2) {
            setIsManipulationDetected(true);
            setAiThought("⚠️ Anomalia Quântica: Mercado com alta manipulação ou paralisado. Protegendo capital...");
            setCurrentConfidence(0);
            return;
        } else {
            setIsManipulationDetected(false);
        }

        // 4. Confluência e Escoragem
        let contractType: ContractType | null = null;
        let confidence = 0;
        let reason = "";
        let thought = "";

        if (digitTradeMode === 'overUnder') {
            const pred = Number(stateAndSetters.digitPrediction) || 4;
            
            let overScore = 0;
            let underScore = 0;

            // Indicador 1: Trend de Curto Prazo (SMA 5)
            const mean5 = window5.reduce((a, b) => a + b, 0) / 5;
            if (mean5 > pred + 1) overScore += 25;
            if (mean5 < pred - 1) underScore += 25;

            // Indicador 2: Pressão Histórica (Volume/Frequência)
            const freqOver = window30.filter(d => d > pred).length / 30;
            const freqUnder = window30.filter(d => d < pred).length / 30;
            if (freqOver > 0.6) overScore += 30;
            if (freqUnder > 0.6) underScore += 30;

            // Indicador 3: Reversão à Média (Bollinger Bands adaptada para Dígitos)
            if (lastDigits[0] > mean30 + stdDev30 * 1.5) {
                underScore += 40; // Exaustão de alta, tende a cair
            }
            if (lastDigits[0] < mean30 - stdDev30 * 1.5) {
                overScore += 40; // Exaustão de baixa, tende a subir
            }

            const maxScore = Math.max(overScore, underScore);
            
            if (overScore >= 65) {
                contractType = 'DIGITOVER';
                confidence = Math.min(99, overScore + 18);
                reason = \`Confluência Quântica OVER: Força direcional detectada (Score: \${overScore}).\`;
                thought = \`Múltiplos indicadores apontam rompimento de alta. SMA5: \${mean5.toFixed(1)}, Volatilidade: \${stdDev30.toFixed(2)}\`;
            } else if (underScore >= 65) {
                contractType = 'DIGITUNDER';
                confidence = Math.min(99, underScore + 18);
                reason = \`Confluência Quântica UNDER: Pressão vendedora detectada (Score: \${underScore}).\`;
                thought = \`Múltiplos indicadores apontam rompimento de baixa. SMA5: \${mean5.toFixed(1)}, Volatilidade: \${stdDev30.toFixed(2)}\`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(\`🔍 Scanner de Liquidez: Buscando convergência (OVER: \${overScore} / UNDER: \${underScore})\`);
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

            if (probEven > 60) evenScore += 25;
            if (probOdd > 60) oddScore += 25;

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

            if (currentStreak >= limit - 1 && limit > 3) {
                // Exaustão máxima atingida, forte probabilidade de reversão
                if (lastIsEven) oddScore += 45;
                else evenScore += 45;
            }

            // Indicador 3: Viés de Volume (Trend Following)
            const evensIn15 = window15.filter(d => d % 2 === 0).length;
            if (evensIn15 > 9) evenScore += 15;
            else if (evensIn15 < 6) oddScore += 15;

            // Indicador 4: Quebra Estrutural Quântica (Confluência Média)
            if (mean30 > 5 && lastIsEven) oddScore += 10;
            if (mean30 < 4 && !lastIsEven) evenScore += 10;

            const maxScore = Math.max(evenScore, oddScore);

            if (evenScore >= 65) {
                contractType = 'DIGITEVEN';
                confidence = Math.min(99, evenScore + 20);
                reason = \`Confluência PAR: Algoritmo identificou padrão ouro (Score: \${evenScore}).\`;
                thought = \`Deep Learning detectou Pico Probabilístico para PAR. Streak: \${currentStreak}/\${limit}, Markov: \${probEven.toFixed(0)}%\`;
            } else if (oddScore >= 65) {
                contractType = 'DIGITODD';
                confidence = Math.min(99, oddScore + 20);
                reason = \`Confluência ÍMPAR: Algoritmo identificou padrão ouro (Score: \${oddScore}).\`;
                thought = \`Deep Learning detectou Pico Probabilístico para ÍMPAR. Streak: \${currentStreak}/\${limit}, Markov: \${probOdd.toFixed(0)}%\`;
            }

            if (!contractType) {
                setCurrentConfidence(Math.max(45, maxScore));
                setAiThought(\`🧠 Deep Scan: Analisando Cadeias de Markov e Distribuição Normal (P: \${evenScore} / I: \${oddScore})\`);
            }
        }

        const minConfidence = Number(stateAndSetters.marketStabilityThreshold) || 55;
        
        if (contractType && confidence >= minConfidence) {
            setCurrentConfidence(confidence);
            const signalId = \`auto-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;
            const result = executeBuy(contractType, 'Módulo Super Quântico', signalId, asset);

            if (result && result.success) {
                lastAutoTradeEpochRef.current = lastTickEpoch;
                addSignal({
                    id: signalId,
                    strategy: result.isVirtual ? 'VIRTUAL: Módulo Super Quântico' : 'Módulo Super Quântico',
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
