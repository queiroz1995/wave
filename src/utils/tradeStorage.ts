"use client";

export interface PersistedTrade {
    id: string;
    date: string; // Formato: YYYY-MM-DD
    timestamp: string; // Formato: HH:MM:SS
    asset: string;
    strategy: string;
    signal: string;
    stake: number;
    profit: number;
    result: 'WIN' | 'LOSS';
    exitDigit?: number;
}

const STORAGE_KEY = 'deriv_bot_monthly_trade_history';

export const getTradeHistory = (): PersistedTrade[] => {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Erro ao ler histórico de trades:", e);
        return [];
    }
};

export const saveTradeToHistory = (trade: {
    id: string;
    asset: string;
    strategy: string;
    signal: string;
    stake: number;
    profit: number;
    result: 'WIN' | 'LOSS';
    exitDigit?: number;
}): PersistedTrade[] => {
    if (typeof window === 'undefined') return [];
    try {
        const history = getTradeHistory();
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });

        const newTrade: PersistedTrade = {
            ...trade,
            date: dateStr,
            timestamp: timeStr
        };

        // Evita duplicados pelo ID
        const filteredHistory = history.filter(t => t.id !== trade.id);
        const updatedHistory = [newTrade, ...filteredHistory];
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
    } catch (e) {
        console.error("Erro ao salvar trade no histórico:", e);
        return getTradeHistory();
    }
};

export const clearTradeHistory = (): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("Erro ao limpar histórico de trades:", e);
    }
};