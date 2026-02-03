"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

const DERIV_WS_URL = import.meta.env.VITE_DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3?app_id=1089';

interface TradingManagerProps {
    isConnected: boolean;
    status: { message: string, color: string };
    setIsConnected: (value: boolean) => void;
    setStatus: (status: { message: string, color: string }) => void;
    setAccountBalance: (balance: number | null) => void;
    onMessage: (data: any) => void;
    reconnectAttemptsRef: React.MutableRefObject<number>;
}

export const useTradingWebSocketManager = ({ 
    isConnected,
    status,
    setIsConnected, 
    setStatus, 
    setAccountBalance, 
    onMessage, 
    reconnectAttemptsRef 
}: TradingManagerProps) => {
    
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isIntentionalDisconnect = useRef(false);
    const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback((token: string, accountType: 'real' | 'demo') => {
        try {
            // Se já houver uma conexão (mesmo que conectando), fecha antes de abrir nova para evitar conflito
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }

            const cleanedToken = token.trim();
            if (!cleanedToken) {
                onMessageRef.current({ type: 'error', payload: `Token não inserido.` });
                return;
            }

            localStorage.setItem('lastAccountType', accountType);
            isIntentionalDisconnect.current = false;
            
            setStatus({ message: 'Conectando...', color: 'bg-yellow-500' });
            
            ws.current = new WebSocket(DERIV_WS_URL);

            // Timeout de segurança para a autenticação (10s)
            if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = setTimeout(() => {
                if (!isConnected && ws.current?.readyState !== WebSocket.CLOSED) {
                    console.warn('[TradingWS] Authentication timeout.');
                    setStatus({ message: 'Tempo esgotado', color: 'bg-red-500' });
                    ws.current?.close();
                }
            }, 10000);

            ws.current.onopen = () => {
                setStatus({ message: 'Autenticando...', color: 'bg-yellow-500' });
                ws.current?.send(JSON.stringify({ authorize: cleanedToken }));
                
                if (pingInterval.current) clearInterval(pingInterval.current);
                pingInterval.current = setInterval(() => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({ ping: 1 }));
                    }
                }, 15000);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data?.msg_type === 'authorize') {
                        if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
                    }

                    if (data.error) {
                        if (data.error.code === 'AuthorizationFailed' || data.error.code === 'InvalidToken') {
                            isIntentionalDisconnect.current = true;
                        }
                    }

                    onMessageRef.current({ type: 'message', payload: data });
                } catch (error) {
                    console.error("[TradingWS] Message error:", error);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                if (pingInterval.current) clearInterval(pingInterval.current);
                if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
                ws.current = null;

                if (isIntentionalDisconnect.current) {
                    setStatus({ message: 'Desconectado', color: 'bg-red-500' });
                } else {
                    const maxAttempts = 3;
                    if (reconnectAttemptsRef.current < maxAttempts) {
                        reconnectAttemptsRef.current++;
                        setStatus({ message: 'Reconectando...', color: 'bg-yellow-500' });
                        setTimeout(() => connect(cleanedToken, accountType), 2000);
                    } else {
                        setStatus({ message: 'Falha na Conexão', color: 'bg-red-500' });
                    }
                }
            };

            ws.current.onerror = () => {
                setStatus({ message: 'Erro de Rede', color: 'bg-red-500' });
            };
        } catch (error) {
            setStatus({ message: 'Erro de Conexão', color: 'bg-red-500' });
        }
    }, [setStatus, setIsConnected, reconnectAttemptsRef, isConnected]);

    const disconnect = useCallback(() => {
        isIntentionalDisconnect.current = true;
        reconnectAttemptsRef.current = 0;
        if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
        ws.current?.close();
    }, [reconnectAttemptsRef]);

    const sendMessage = useCallback((payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
        }
    }, []);

    return useMemo(() => ({
        isConnected,
        status,
        connect,
        disconnect,
        sendMessage,
        wsRef: ws,
    }), [isConnected, status, connect, disconnect, sendMessage]);
};