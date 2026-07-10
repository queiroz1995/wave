const fs = require('fs');
let content = fs.readFileSync('src/components/bot/AIOperatingScreen.tsx', 'utf8');

const regex = /    const manualSignalIntelligence = useMemo\(\(\) => \{[\s\S]*?    \}, \[lastDigits\]\);/g;

const advancedAI = `    const manualSignalIntelligence = useMemo(() => {
        const digits = lastDigits || [];
        if (digits.length < 20) {
            return {
                recommendation: "AGUARDAR",
                confidence: 0,
                evenPercent: 50,
                oddPercent: 50,
                reason: "Coletando amostras (Aguarde 20+ ticks)..."
            };
        }
        
        let currentStreak = 1;
        const firstIsEven = digits[0] % 2 === 0;
        for (let i = 1; i < digits.length; i++) {
            if ((digits[i] % 2 === 0) === firstIsEven) {
                currentStreak++;
            } else {
                break;
            }
        }
        const currentParity = firstIsEven ? 'EVEN' : 'ODD';

        const getWindowMaxStreak = (windowDigits: number[], parity: 'EVEN' | 'ODD') => {
            let max = 0;
            let current = 0;
            const chronological = [...windowDigits].reverse();
            for (const d of chronological) {
                const isEven = d % 2 === 0;
                if ((parity === 'EVEN' && isEven) || (parity === 'ODD' && !isEven)) {
                    current++;
                    if (current > max) max = current;
                } else {
                    current = 0;
                }
            }
            return max;
        };

        const maxEven30 = getWindowMaxStreak(digits.slice(0, 30), 'EVEN');
        const maxOdd30 = getWindowMaxStreak(digits.slice(0, 30), 'ODD');
        const maxEven60 = getWindowMaxStreak(digits.slice(0, 60), 'EVEN');
        const maxOdd60 = getWindowMaxStreak(digits.slice(0, 60), 'ODD');

        const sampleRSI = digits.slice(0, 14);
        const evensRSI = sampleRSI.filter((digit) => digit % 2 === 0).length;
        const evenPercent = Math.round((evensRSI / 14) * 100);
        const oddPercent = 100 - evenPercent;

        let recommendation = "AGUARDAR";
        let confidence = 0;
        let reason = "Zona de ruído estatístico. Aguardando confluências...";

        // Análise de Confluência Neural para o App
        if (currentParity === 'EVEN') {
            if (currentStreak >= maxEven60 && maxEven60 > 2) {
                recommendation = "ÍMPAR";
                confidence = 98;
                reason = \`Aviso de Colapso (60T): Sequência PAR (\${currentStreak}x) excedeu o teto de \${maxEven60}x. Reversão massiva.\`;
            } else if (currentStreak >= maxEven30 && evenPercent > 70) {
                recommendation = "ÍMPAR";
                confidence = 92;
                reason = \`Confluência Dupla (30T): Exaustão (\${currentStreak}x) alinhada com RSI sobrecomprado (\${evenPercent}% PAR).\`;
            } else if (currentStreak >= maxEven30) {
                recommendation = "ÍMPAR";
                confidence = 85;
                reason = \`Exaustão Básica (30T): Sequência PAR atingiu \${currentStreak}x.\`;
            } else if (evenPercent >= 78 && currentStreak < 2) {
                recommendation = "PAR"; // Trend following
                confidence = 82;
                reason = \`Trend Following Neural: Momentum esmagador de PAR (\${evenPercent}%). Rompendo a favor da força.\`;
            }
        } else {
            if (currentStreak >= maxOdd60 && maxOdd60 > 2) {
                recommendation = "PAR";
                confidence = 98;
                reason = \`Aviso de Colapso (60T): Sequência ÍMPAR (\${currentStreak}x) excedeu o teto de \${maxOdd60}x. Reversão massiva.\`;
            } else if (currentStreak >= maxOdd30 && oddPercent > 70) {
                recommendation = "PAR";
                confidence = 92;
                reason = \`Confluência Dupla (30T): Exaustão (\${currentStreak}x) alinhada com RSI sobrecomprado (\${oddPercent}% ÍMPAR).\`;
            } else if (currentStreak >= maxOdd30) {
                recommendation = "PAR";
                confidence = 85;
                reason = \`Exaustão Básica (30T): Sequência ÍMPAR atingiu \${currentStreak}x.\`;
            } else if (oddPercent >= 78 && currentStreak < 2) {
                recommendation = "ÍMPAR"; // Trend following
                confidence = 82;
                reason = \`Trend Following Neural: Momentum esmagador de ÍMPAR (\${oddPercent}%). Rompendo a favor da força.\`;
            }
        }

        return {
            recommendation,
            confidence,
            evenPercent,
            oddPercent,
            reason
        };
    }, [lastDigits]);`;

content = content.replace(regex, advancedAI);

fs.writeFileSync('src/components/bot/AIOperatingScreen.tsx', content);
