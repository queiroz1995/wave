"use client";

/**
 * Utilitários para a Nova Trading API v1 da Deriv
 * Baseado na documentação REST fornecida.
 */

const BASE_URL = "https://api.derivws.com/trading/v1/options";

export interface DerivAccount {
    account_id: string;
    account_type: 'demo' | 'real';
    currency: string;
    balance: number;
    is_virtual?: boolean;
}

/**
 * 1. Busca a lista de contas vinculadas ao PAT token (Escopo: trade)
 * GET /trading/v1/options/accounts
 */
export async function getDerivAccounts(token: string, appId: string): Promise<DerivAccount[]> {
    const cleanedToken = token.trim();
    const url = `${BASE_URL}/accounts`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${cleanedToken}`,
            'Deriv-App-ID': appId,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.errors?.[0]?.message || data.error?.message || `Erro ${response.status}`;

        if (response.status === 401) {
            throw new Error('Deriv recusou o PAT (401). Gere um novo token com permissão trade e confira se ele pertence ao App ID informado.');
        }

        if (response.status === 503) {
            throw new Error('A API de contas da Deriv está temporariamente indisponível (503). O app vai tentar usar conexão direta por WebSocket.');
        }

        throw new Error(`Falha ao buscar contas: ${errorMsg}`);
    }

    const result = await response.json();
    const accounts = Array.isArray(result.data) ? result.data : [];

    return accounts.map((acc: any) => ({
        account_id: acc.account_id,
        account_type: acc.account_type === 'virtual' ? 'demo' : acc.account_type,
        currency: acc.currency,
        balance: parseFloat(acc.balance || 0),
        is_virtual: acc.account_type === 'virtual' || acc.is_virtual === true
    }));
}

/**
 * 2. Solicita um URL WebSocket através de OTP (Escopo: trade)
 * POST /trading/v1/options/accounts/{accountId}/otp
 */
export async function getDerivOtpUrl(token: string, accountId: string, appId: string): Promise<string> {
    const cleanedToken = token.trim();
    const url = `${BASE_URL}/accounts/${accountId}/otp`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cleanedToken}`,
            'Deriv-App-ID': appId,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.errors?.[0]?.message || data.error?.message || `Erro ${response.status}`;

        if (response.status === 401) {
            throw new Error('Deriv recusou o PAT ao gerar OTP (401). Confira permissão trade, App ID e se o token não foi revogado.');
        }

        if (response.status === 503) {
            throw new Error('A geração de OTP da Deriv está temporariamente indisponível (503).');
        }

        throw new Error(`Falha ao gerar OTP: ${errorMsg}`);
    }

    const result = await response.json();
    const wsUrl = result.data?.url;

    if (!wsUrl) {
        throw new Error('A Deriv não retornou a URL WebSocket OTP.');
    }

    return wsUrl;
}