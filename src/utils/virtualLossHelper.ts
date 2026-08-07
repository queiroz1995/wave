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

export const getLossDigits = (
    mode: string,
    prediction: number,
    direction: string,
    contractType?: string
): number[] => {
    if (contractType === 'DIGITEVEN') return [1, 3, 5, 7, 9];
    if (contractType === 'DIGITODD') return [0, 2, 4, 6, 8];
    if (contractType === 'DIGITOVER') return Array.from({ length: Math.min(10, Math.max(1, prediction + 1)) }, (_, i) => i);
    if (contractType === 'DIGITUNDER') return Array.from({ length: Math.min(10, Math.max(1, 10 - prediction)) }, (_, i) => prediction + i);

    if (mode === 'evenOdd') {
        if (direction === 'ODD') return [0, 2, 4, 6, 8];
        return [1, 3, 5, 7, 9];
    }

    if (mode === 'overUnder') {
        if (direction === 'OVER') {
            return Array.from({ length: Math.min(10, Math.max(1, prediction + 1)) }, (_, i) => i);
        } else {
            return Array.from({ length: Math.min(10, Math.max(1, 10 - prediction)) }, (_, i) => prediction + i);
        }
    }

    if (mode === 'matchesDiffers') {
        if (direction === 'MATCHES') {
            return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== prediction);
        } else {
            return [prediction];
        }
    }

    return [1, 3, 5, 7, 9];
};

export interface DigitStatItem {
    digit: number;
    count: number;
    percentage: number;
    isLossDigit: boolean;
}

export const getDigitPercentages = (
    digits: number[],
    mode: string,
    prediction: number,
    direction: string,
    contractType?: string,
    windowSize = 50
): DigitStatItem[] => {
    const sample = (digits || []).slice(0, windowSize);
    const total = sample.length;
    const lossDigits = getLossDigits(mode, prediction, direction, contractType);

    if (total === 0) {
        return Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
            isLossDigit: lossDigits.includes(i)
        }));
    }

    const counts = new Array(10).fill(0);
    for (const d of sample) {
        if (typeof d === 'number' && d >= 0 && d <= 9) {
            counts[d]++;
        }
    }

    return counts.map((count, digit) => ({
        digit,
        count,
        percentage: (count / total) * 100,
        isLossDigit: lossDigits.includes(digit)
    }));
};

export const checkLossDigitHigh = (
    digits: number[],
    mode: string,
    prediction: number,
    direction: string,
    thresholdPercent = 18,
    contractType?: string,
    windowSize = 50
) => {
    const stats = getDigitPercentages(digits, mode, prediction, direction, contractType, windowSize);
    const lossDigits = getLossDigits(mode, prediction, direction, contractType);

    const highLossDigits = stats.filter(
        s => s.isLossDigit && s.percentage >= thresholdPercent
    );

    const maxLossDigit = stats
        .filter(s => s.isLossDigit)
        .reduce(
            (max, curr) => (curr.percentage > max.percentage ? curr : max),
            { digit: -1, count: 0, percentage: 0, isLossDigit: true }
        );

    return {
        isHigh: highLossDigits.length > 0,
        lossDigits,
        highLossDigits,
        maxLossDigit,
        stats
    };
};

