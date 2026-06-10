"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

const DERIV_WS_URL = import.meta.env.VITE_DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3?app_id=1089';

// Define a interface para os setters que o hook precisa
interface TradingManagerProps {
    isConnected: boolean;
    status: { message: string, color: string };
    setIsConnected: (value: boolean) => void;
    setStatus: (status: { message: string, color: string }) => void;
    setAccountBalance: (balance: number | null) => void;
    onMessage: (data: any) => void;
    reconnectAttemptsRef: React.MutableRefObject<number>;
}

// Este hook gerencia a conexão WebSocket com a API da Deriv para negociação.
export const useTradingWebSocketManager = ({ 
    isConnected, // Adicionado como prop
    status, // Adicionado como prop
    setIsConnected, 
    setStatus, 
    setAccountBalance, 
    onMessage, 
    reconnectAttemptsRef 
}: TradingManagerProps) => {
    
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isIntentionalDisconnect = useRef(false);

    // Usa uma ref para garantir que o callback onMessage seja sempre a versão mais recente.
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback((token: string, accountType: 'real' | 'demo', accountId?: string) => {
        try {
            if (ws.current) {
                console.warn('[TradingWS] Connection attempt while already connected or connecting.');
                onMessageRef.current({ type: 'info', payload: 'Uma conexão já está em andamento.' });
                return;
            }

            const cleanedToken = token.trim();
            if (!cleanedToken) {
                onMessageRef.current({ type: 'error', payload: `Por favor, insira o Token da Conta ${accountType === 'real' ? 'Real' : 'Demo'}.` });
                return;
            }

            // Aceita: pat_ (Personal Access Token), ROT/VRT (tokens OAuth Deriv), ou qualquer token com >= 10 chars
            const isPAT = cleanedToken.startsWith('pat_');
            const isOAuthToken = /^[A-Za-z0-9]{10,}$/.test(cleanedToken);
            if (!isPAT && !isOAuthToken) {
                onMessageRef.current({ type: 'error', payload: 'Token inválido. Use um PAT (pat_...), token OAuth Deriv (ex: ROT...) ou token API válido.' });
                return;
            }

            localStorage.setItem('lastAccountType', accountType);
            isIntentionalDisconnect.current = false;
            const tokenPrefix = isPAT ? 'PAT' : cleanedToken.substring(0, 3).toUpperCase();
            console.log(`[TradingWS] Connecting to ${accountType} account... (formato: ${tokenPrefix})`);
            onMessageRef.current({ type: 'info', payload: `Conectando à Conta ${accountType === 'real' ? 'Real' : 'Demo'}...` });
            setStatus({ message: 'Conectando...', color: 'bg-yellow-500' });
            
            ws.current = new WebSocket(DERIV_WS_URL);

            ws.current.onopen = () => {
                console.log('[TradingWS] Connection opened. Authenticating...');
                onMessageRef.current({ type: 'info', payload: 'Conexão estabelecida. Autenticando...' });
                setStatus({ message: 'Autenticando...', color: 'bg-yellow-500' });
                // Para PAT com accountId específico, envia add_loginid para selecionar a conta
                // Tokens OAuth (ROT, VRT, etc.) já são vinculados a uma conta específica
                const authPayload: any = { authorize: cleanedToken };
                if (isPAT && accountId?.trim()) {
                    authPayload.add_loginid = accountId.trim();
                }
                ws.current?.send(JSON.stringify(authPayload));
                
                if (pingInterval.current) clearInterval(pingInterval.current);
                pingInterval.current = setInterval(() => ws.current?.send(JSON.stringify({ ping: 1 })), 20000);
            };

            ws.current.onerror = (error) => {
                console.error("[TradingWS] WebSocket Error:", error);
                onMessageRef.current({ type: 'error', payload: 'Ocorreu um erro na conexão. Verifique sua internet e o console para detalhes.' });
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // console.log('[TradingWS] Received message:', data);

                    if (data.error) {
                        const errorCode = data.error?.code ?? 'UNKNOWN';
                        const errorMsg = data.error?.message ?? '';
                        console.error(`[TradingWS] Deriv API Error [${errorCode}]: ${errorMsg}`);

                        if (errorCode === 'AuthorizationFailed' ||
                            errorCode === 'InvalidToken' ||
                            errorCode === 'InvalidAppID' ||
                            errorMsg.toLowerCase().includes('permission'))
                        {
                            onMessageRef.current({ type: 'auth_error', payload: `Erro de autenticação [${errorCode}]: ${errorMsg}. Verifique o token e tente novamente.` });
                            isIntentionalDisconnect.current = true;
                            ws.current?.close();
                        } else {
                            // Outros erros da API (ex: erro de compra) — repassa para o contexto tratar
                            onMessageRef.current({ type: 'message', payload: data });
                        }
                        return;
                    }

                    // Passa a mensagem completa para o contexto.
                    onMessageRef.current({ type: 'message', payload: data });
                } catch (error) {
                    console.error("[TradingWS] Failed to process message:", error, "Raw data:", event.data);
                    onMessageRef.current({ type: 'error', payload: 'Recebida uma mensagem inválida do servidor.' });
                }
            };

            ws.current.onclose = () => {
                console.warn('[TradingWS] Connection closed.');
                setIsConnected(false);
                if (pingInterval.current) clearInterval(pingInterval.current);
                ws.current = null;

                if (isIntentionalDisconnect.current) {
                    console.log('[TradingWS] Intentional disconnect.');
                    onMessageRef.current({ type: 'info', payload: `Conexão finalizada.` });
                    setStatus({ message: 'Desconectado', color: 'bg-red-500' });
                } else {
                    const maxAttempts = 5;
                    if (reconnectAttemptsRef.current < maxAttempts) {
                        const delay = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000 + 2000);
                        reconnectAttemptsRef.current++;
                        console.log(`[TradingWS] Connection lost. Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttemptsRef.current}/${maxAttempts})`);
                        onMessageRef.current({ type: 'info', payload: `Conexão perdida. Tentando reconectar em ${delay / 1000}s... (${reconnectAttemptsRef.current}/${maxAttempts})` });
                        setStatus({ message: 'Reconectando...', color: 'bg-yellow-500' });
                        setTimeout(() => connect(cleanedToken, accountType, accountId), delay);
                    } else {
                        console.error(`[TradingWS] Failed to reconnect after ${maxAttempts} attempts.`);
                        onMessageRef.current({ type: 'error', payload: `Não foi possível reconectar após ${maxAttempts} tentativas. Verifique sua conexão.` });
                        setStatus({ message: 'Falha na Conexão', color: 'bg-red-500' });
                    }
                }
                // Envia evento de fechamento para o contexto resetar estados de carregamento
                onMessageRef.current({ type: 'close' });
            };
        } catch (error) {
            console.error("[TradingWS] Critical error on connect:", error);
            onMessageRef.current({ type: 'error', payload: 'Não foi possível iniciar a conexão. Verifique o console.' });
            setStatus({ message: 'Erro de Conexão', color: 'bg-red-500' });
        }
    }, [setStatus, setIsConnected, reconnectAttemptsRef]); // Removido onMessageRef.current, pois ele é atualizado via useEffect

    const disconnect = useCallback(() => {
        console.log('[TradingWS] Disconnecting intentionally.');
        isIntentionalDisconnect.current = true;
        reconnectAttemptsRef.current = 0;
        if (ws.current) {
            ws.current.close();
            ws.current = null; // Limpa a referência imediatamente para permitir nova conexão sem avisos de duplicidade
        }
    }, [reconnectAttemptsRef]);

    const sendMessage = useCallback((payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('[TradingWS] Sending message:', payload);
            ws.current.send(JSON.stringify(payload));
        } else {
            console.error('[TradingWS] Cannot send message. WebSocket is not open.');
            onMessageRef.current({ type: 'error', payload: 'Não é possível enviar mensagem. WebSocket não está conectado.' });
        }
    }, []);

    // Retornamos as funções de controle e o estado atual (que será atualizado via BotContext)
    return useMemo(() => ({
        isConnected: isConnected, // Agora definido como prop
        status: status, // Agora definido como prop
        connect,
        disconnect,
        sendMessage,
        wsRef: ws,
    }), [isConnected, status, connect, disconnect, sendMessage]);
};
