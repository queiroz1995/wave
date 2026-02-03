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
    const [isSocketOpen, setIsSocketOpen] = useState(false);

    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connectSocket = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

        console.log("[TradingWS] Estabelecendo conexão pública...");
        ws.current = new WebSocket(DERIV_WS_URL);

        ws.current.onopen = () => {
            console.log("[TradingWS] Conexão pública aberta.");
            setIsSocketOpen(true);
            reconnectAttemptsRef.current = 0;
            
            if (pingInterval.current) clearInterval(pingInterval.current);
            pingInterval.current = setInterval(() => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ ping: 1 }));
                }
            }, 15000);

            // Avisa o app que o socket está pronto para receber comandos públicos (como ticks)
            onMessageRef.current({ type: 'socket_ready' });
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessageRef.current({ type: 'message', payload: data });
            } catch (error) {
                console.error("[TradingWS] Message error:", error);
            }
        };

        ws.current.onclose = () => {
            setIsSocketOpen(false);
            setIsConnected(false);
            if (pingInterval.current) clearInterval(pingInterval.current);
            ws.current = null;

            if (!isIntentionalDisconnect.current) {
                console.log("[TradingWS] Conexão perdida. Tentando reconectar...");
                setTimeout(connectSocket, 3000);
            }
        };

        ws.current.onerror = (err) => {
            console.error("[TradingWS] Erro de conexão:", err);
            setStatus({ message: 'Erro de Rede', color: 'bg-red-500' });
        };
    }, [reconnectAttemptsRef, setStatus, setIsConnected]);

    // Conecta o socket automaticamente no mount
    useEffect(() => {
        connectSocket();
        return () => {
            isIntentionalDisconnect.current = true;
            ws.current?.close();
        };
    }, [connectSocket]);

    const authorize = useCallback((token: string, accountType: 'real' | 'demo') => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            connectSocket();
            // Espera um pouco e tenta autorizar
            setTimeout(() => authorize(token, accountType), 1000);
            return;
        }

        const cleanedToken = token.trim();
        if (!cleanedToken) return;

        console.log("[TradingWS] Enviando autorização...");
        setStatus({ message: 'Autenticando...', color: 'bg-yellow-500' });
        ws.current.send(JSON.stringify({ authorize: cleanedToken }));
    }, [connectSocket, setStatus]);

    const disconnect = useCallback(() => {
        // Para a autorização mas mantém o socket aberto para ticks públicos se desejar
        // Ou fecha tudo se for intenção do usuário
        setIsConnected(false);
        setStatus({ message: 'Desconectado', color: 'bg-red-500' });
    }, [setIsConnected, setStatus]);

    const sendMessage = useCallback((payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
        } else {
            console.warn("[TradingWS] Tentativa de enviar mensagem com socket fechado:", payload);
        }
    }, []);

    return useMemo(() => ({
        isConnected,
        isSocketOpen,
        status,
        connect: authorize, // Mapeado para manter compatibilidade
        disconnect,
        sendMessage,
        wsRef: ws,
    }), [isConnected, isSocketOpen, status, authorize, disconnect, sendMessage]);
};