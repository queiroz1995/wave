const fs = require('fs');
let content = fs.readFileSync('src/context/BotContext.tsx', 'utf8');

const regex = /\/\/ IA DE ALTA PRECISÃO \(Deep Learning Simples \+ Confluência de Indicadores\)[\s\S]*?const minConfidence = Number\(stateAndSetters\.marketStabilityThreshold\) \|\| 55;/;

const newLogic = `// IA DE ALTA PRECISÃO (Deep Learning Simples + Confluência de Indicadores)
        
        const isMartingale = martingaleLevel.current > 0;
        
        // Em caso de Martingale (derrota anterior), a IA ativa o "Modo Conservador Absoluto" para proteger o capital
        if (isMartingale) {
            // No Gale, exige exaustão absoluta (histórica) OU confluência quádrupla
            if (currentStreak >= limit60 && limit60 > 3) {
                contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                confidence = 99;
                reason = \`[MODO GALE] Exaustão Absoluta (60T): Streak (\${currentStreak}x) supera teto (\${limit60}x).\`;
                thought = \`GALE ATIVO: Rompimento histórico máximo detectado. Entrada de alta precisão para recuperação.\`;
            } else if (currentStreak >= limit30 && limit30 >= 4) {
                const isMarkovStrong = currentParity === 'EVEN' ? probNextIsOdd >= 85 : probNextIsEven >= 85;
                const isRsiSupporting = currentParity === 'EVEN' ? overboughtEven : oversoldEven;
                
                if (isMarkovStrong && isRsiSupporting && markovConfidenceLevel >= 4 && !isHighlyChaotic) {
                    contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                    confidence = 98;
                    reason = \`[MODO GALE] Confluência Quádrupla: Exaustão + RSI + Deep Markov Nível \${markovConfidenceLevel}.\`;
                    thought = \`GALE ATIVO: Alinhamento perfeito de 4 fatores estatísticos para entrada segura.\`;
                } else {
                    setAiThought(\`[MODO GALE] Aguardando alinhamento estrito (Streak, RSI e Markov >= 85%) para recuperar...\`);
                }
            } else if (probNextIsEven >= 95 && currentParity === 'ODD' && !isHighlyChaotic && markovConfidenceLevel >= 5) {
                contractType = 'DIGITEVEN';
                confidence = 96;
                reason = \`[MODO GALE] Deep Sniper: Probabilidade crítica para PAR (\${probNextIsEven.toFixed(1)}%).\`;
                thought = \`GALE ATIVO: Rede Markoviana de Nível 5 indica reversão certeira.\`;
            } else if (probNextIsOdd >= 95 && currentParity === 'EVEN' && !isHighlyChaotic && markovConfidenceLevel >= 5) {
                contractType = 'DIGITODD';
                confidence = 96;
                reason = \`[MODO GALE] Deep Sniper: Probabilidade crítica para ÍMPAR (\${probNextIsOdd.toFixed(1)}%).\`;
                thought = \`GALE ATIVO: Rede Markoviana de Nível 5 indica reversão certeira.\`;
            } else {
                 setAiThought(\`[MODO GALE] Analisando o mercado com máxima cautela para garantir a vitória do martingale...\`);
            }
        } else {
            // Operação Normal
            // 1. Exaustão Extrema Confirmada por RSI
            if (currentStreak >= limit60 && limit60 > 2) {
                contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                confidence = isHighlyChaotic ? 88 : 99;
                reason = \`Exaustão Absoluta (60T): Streaks atuais (\${currentStreak}x) superam limite histórico (\${limit60}x).\`;
                thought = \`Rompimento de Limite Histórico (60T) detectado. Probabilidade massiva de reversão estatística.\`;
            }
            // 2. Confluência de Exaustão Média com RSI e Markov Deep (Nível 4 ou 5)
            else if (currentStreak >= limit30 && limit30 >= 3) {
                const isMarkovStrong = currentParity === 'EVEN' ? probNextIsOdd >= 80 : probNextIsEven >= 80;
                const isRsiSupporting = currentParity === 'EVEN' ? overboughtEven : oversoldEven;
                
                if (isMarkovStrong && isRsiSupporting) {
                    contractType = currentParity === 'EVEN' ? 'DIGITODD' : 'DIGITEVEN';
                    confidence = isHighlyChaotic ? 89 : 96;
                    reason = \`Confluência Master (30T): Exaustão (\${currentStreak}x) + RSI Extremo + Markov Nível \${markovConfidenceLevel}.\`;
                    thought = \`Alinhamento Triplo: Limite de 30T, Sobrecarga no RSI e Cadeia de Markov apontam reversão imediata.\`;
                } else {
                    setAiThought(\`Observando: Limite de 30T atingido (\${currentStreak}x). Aguardando alinhamento do RSI e Markov para entrar.\`);
                }
            }
            // 3. Padrão Sniper (Markov Profundo + Tendência Confirmada)
            else if (probNextIsEven >= 88 && currentParity === 'ODD' && !isHighlyChaotic && markovConfidenceLevel >= 4) {
                contractType = 'DIGITEVEN';
                confidence = Math.round(probNextIsEven);
                reason = \`Deep Markov Sniper: Probabilidade extrema para PAR (\${probNextIsEven.toFixed(1)}%).\`;
                thought = \`A Rede Neural Markoviana (Nível \${markovConfidenceLevel}) identificou uma assimetria gritante a favor de PAR.\`;
            }
            else if (probNextIsOdd >= 88 && currentParity === 'EVEN' && !isHighlyChaotic && markovConfidenceLevel >= 4) {
                contractType = 'DIGITODD';
                confidence = Math.round(probNextIsOdd);
                reason = \`Deep Markov Sniper: Probabilidade extrema para ÍMPAR (\${probNextIsOdd.toFixed(1)}%).\`;
                thought = \`A Rede Neural Markoviana (Nível \${markovConfidenceLevel}) identificou uma assimetria gritante a favor de ÍMPAR.\`;
            }
            // 4. Fluxo de Tendência (RSI Trend Following)
            else if (isTrending && (overboughtEven || oversoldEven) && currentStreak <= 2) {
                // Se está em forte tendência Par ou Ímpar e acabou de dar um respiro, segue a tendência
                if (overboughtEven && probNextIsEven > 60) {
                    contractType = 'DIGITEVEN';
                    confidence = 85;
                    reason = \`Trend Following (RSI): Mercado em forte fluxo PAR (\${rsiEven.toFixed(1)}%), seguindo a força motriz.\`;
                    thought = \`RSI aponta sobrecompra de PAR em mercado de baixa variância. Aderindo ao fluxo principal.\`;
                } else if (oversoldEven && probNextIsOdd > 60) {
                    contractType = 'DIGITODD';
                    confidence = 85;
                    reason = \`Trend Following (RSI): Mercado em forte fluxo ÍMPAR (\${(100-rsiEven).toFixed(1)}%), seguindo a força motriz.\`;
                    thought = \`RSI aponta sobrecompra de ÍMPAR em mercado de baixa variância. Aderindo ao fluxo principal.\`;
                }
            }
        }

        const minConfidence = isMartingale ? 90 : (Number(stateAndSetters.marketStabilityThreshold) || 55);`;

content = content.replace(regex, newLogic);
fs.writeFileSync('src/context/BotContext.tsx', content);
