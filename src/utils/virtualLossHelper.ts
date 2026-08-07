export const isDigitVirtualLoss = (
    digit: number,
    mode: string,
    prediction: number,
    direction: string
): boolean => {
    if (mode === 'evenOdd') {
        const isEven = digit % 2 === 0;
        if (direction === 'ODD') {
            return isEven; // Loss se for Par quando esperando Ímpar
        }
        return !isEven; // Loss se for Ímpar quando esperando Par
    }
    if (mode === 'overUnder') {
        if (direction === 'OVER') {
            return digit <= prediction;
        } else {
            return digit >= prediction;
        }
    }
    if (mode === 'matchesDiffers') {
        if (direction === 'MATCHES') {
            return digit !== prediction;
        } else {
            return digit === prediction;
        }
    }
    return digit % 2 !== 0;
};

export const getMarketVirtualLossStreak = (
    digits: number[],
    mode: string,
    prediction: number,
    direction: string
): number => {
    if (!digits || digits.length === 0) return 0;
    let streak = 0;
    for (const digit of digits) {
        if (isDigitVirtualLoss(digit, mode, prediction, direction)) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};
