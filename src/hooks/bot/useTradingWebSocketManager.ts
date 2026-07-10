"use client";

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { getDerivAccounts, getDerivOtpUrl, DerivAccount } from '@/lib/deriv-api';
import { DEFAULT_DERIV_APP_ID } from './useBotState';

interface TradingManagerProps {
    isConnected: boolean;
    status: { message: string, color: string };
    setIsConnected: (value: boolean) => void;
    setIsConnecting: (value: boolean) => void;
    setStatus: (status: { message: string, color: string }) => void;
    setAccountBalance: (balance: number | null) => void;
    setAccountId: (id: string) => void;
    setCurrency: (currency: string) => void;
    onMessage: (data: any) => void;
    reconnectAttemptsRef: React.MutableRefObject<number>;
    addLog: (msg: string, type: any) => void;
}

type AccountType = 'real' | 'demo';

const selectAccount = (accounts: DerivAccount[], accountType: AccountType) => {
    const matched = accounts.find((account) => {
        if (accountType === 'demo') {
            return account.account_type === 'demo' || account.is_virtual === true;
        }
        return account.account_type === accountType;
    });
    return matched || accounts[0];
};

export const useTradingWebSocketManager = ({
    isConnected,
    status,
    setIsConnected,
    setIsConnecting,
    setStatus,
    setAccountBalance,
    setAccountId,
    setCurrency,
    onMessage,
    reconnectAttemptsRef,
    addLog
}: TradingManagerProps) => {
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const isIntentionalDisconnect = useRef(false);
    const connectionId = useRef(0);
    const fallbackAttempted = useRef(false);

    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const clearPing = useCallback(() => {
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
    }, []);

    const startPing = useCallback(() => {
        clearPing();
        pingInterval.current = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ ping: 1 }));
            }
        }, 20000);
    }, [clearPing]);

    const disconnect = useCallback(() => {
        isIntentionalDisconnect.current = true;
        reconnectAttemptsRef.current = 0;
        connectionId.current += 1;
        fallbackAttempted.current = false;

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        clearPing();
        setIsConnected(false);
        setIsConnecting(false);
        setStatus({ message: 'Desconectado', color: 'bg-red-500' });
        addLog("[SISTEMA] Conexão encerrada pelo usuário.", "INFO");
    }, [setIsConnected, setIsConnecting, setStatus, addLog, reconnectAttemptsRef, clearPing]);

    const setupSocketListeners = useCallback((socket: WebSocket, currentConnectionId: number, cleanToken: string, cleanAppId: string, accountType: AccountType) => {
        socket.onmessage = (event) => {
            if (connectionId.current !== currentConnectionId || ws.current !== socket) return;

            const data = JSON.parse(event.data);

            if (data.error) {
                const errorMsg = data.error.message || "Erro desconhecido";
                const errorCode = data.error.code;
                
                // Se falhar por App ID inválido ou redirecionamento não autorizado, tenta o fallback para o App ID 1089
                if ((errorCode === 'AppIdInvalid' || errorCode === 'InvalidAppId' || errorCode === 'InvalidRedirectUrl' || errorCode === 'InvalidOrigin') && !fallbackAttempted.current && cleanAppId !== '1089') {
                    fallbackAttempted.current = true;
                    addLog(`[SISTEMA] App ID ${cleanAppId} rejeitado por restrição de origem. Iniciando fallback automático para o App ID público 1089...`, "INFO");
                    
                    // Fecha o socket atual e abre com o App ID 1089
                    socket.close();
                    
                    setTimeout(() => {
                        const fallbackSocket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);
                        ws.current = fallbackSocket;
                        setupSocketListeners(fallbackSocket, currentConnectionId, cleanToken, '1089', accountType);
                        
                        fallbackSocket.onopen = () => {
                            if (connectionId.current !== currentConnectionId || ws.current !== fallbackSocket) return;
                            addLog("[SISTEMA] Conectado via App ID público 1089. Autenticando...", "INFO");
                            fallbackSocket.send(JSON.stringify({ authorize: cleanToken }));
                        };
                    }, 500);
                    return;
                }

                const isConnectionError = ['InvalidToken', 'AppIdInvalid', 'InvalidAppId', 'AuthorizationRequired', 'InvalidAuthorization'].includes(errorCode) || data.msg_type === 'authorize';

                setIsConnecting(false);
                addLog(`[ERRO DERIV] ${errorCode}: ${errorMsg}`, "ERROR");

                if (isConnectionError) {
                    setIsConnected(false);
                    setStatus({ message: 'Falha de Link', color: 'bg-red-500' });
                } else {
                    setStatus({ message: 'Link Estável', color: 'bg-emerald-500' });
                }

                onMessageRef.current({ type: 'message', payload: data });
                return;
            }

            if (data.msg_type === 'authorize' && data.authorize) {
                setIsConnected(true);
                setIsConnecting(false);
                setStatus({ message: 'Link Estável', color: 'bg-emerald-500' });
                setAccountBalance(parseFloat(data.authorize.balance));
                setAccountId(data.authorize.loginid);
                if (data.authorize.currency) {
                    setCurrency(data.authorize.currency);
                }
                const accountLabel = data.authorize.is_virtual ? 'DEMO' : 'REAL';
                addLog(`[SUCESSO] Conectado à conta ${data.authorize.loginid} (${accountLabel}/${data.authorize.currency})`, "TRADE");
                socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                startPing();
            }

            if (data.msg_type === 'balance' && data.balance?.balance !== undefined) {
                setAccountBalance(parseFloat(data.balance.balance));
                if (data.balance.currency) {
                    setCurrency(data.balance.currency);
                }
            }

            onMessageRef.current({ type: 'message', payload: data });
        };

        socket.onclose = (event) => {
            if (connectionId.current !== currentConnectionId || ws.current !== socket) return;

            setIsConnected(false);
            setIsConnecting(false);
            clearPing();
            ws.current = null;

            if (!isIntentionalDisconnect.current) {
                const reason = event.reason ? ` Motivo: ${event.reason}` : '';
                setStatus({ message: 'Link Perdido', color: 'bg-red-500' });
                addLog(`[AVISO] Conexão encerrada (Código: ${event.code}).${reason}`, "ERROR");
            }
        };

        socket.onerror = () => {
            if (connectionId.current !== currentConnectionId || ws.current !== socket) return;

            addLog("[ERRO] Falha crítica de rede no WebSocket.", "ERROR");
            setIsConnecting(false);
            setStatus({ message: 'Falha de Link', color: 'bg-red-500' });
        };
    }, [setIsConnected, setIsConnecting, setStatus, setAccountBalance, setAccountId, setCurrency, addLog, startPing, clearPing]);

    const connectWithToken = useCallback(async (token: string, appId: string, accountType: AccountType = 'demo') => {
        const cleanToken = token.trim();
        const cleanAppId = appId.trim() || DEFAULT_DERIV_APP_ID;
        const isPatToken = cleanToken.toLowerCase().startsWith('pat_');

        // Detecta se está rodando dentro do aplicativo de celular (Capacitor)
        const isMobileApp = window.location.href.startsWith('capacitor://') || 
                            (window.location.hostname === 'localhost' && !window.location.port) ||
                            window.location.pathname.includes('android_asset');

        if (!cleanToken) {
            addLog("[ERRO] Token de acesso vazio.", "ERROR");
            setStatus({ message: 'Token ausente', color: 'bg-red-500' });
            setIsConnecting(false);
            return;
        }

        if (!cleanAppId) {
            addLog("[ERRO] App ID ausente.", "ERROR");
            setStatus({ message: 'App ID ausente', color: 'bg-red-500' });
            setIsConnecting(false);
            return;
        }

        try {
            isIntentionalDisconnect.current = false;
            setIsConnecting(true);
            setStatus({ message: 'Iniciando Link...', color: 'bg-yellow-500' });

            connectionId.current += 1;
            const currentConnectionId = connectionId.current;

            if (ws.current) {
                ws.current.onclose = null;
                ws.current.onerror = null;
                ws.current.onmessage = null;
                ws.current.onopen = null;
                ws.current.close();
                ws.current = null;
            }

            clearPing();

            const openDirectAuthorizedSocket = (connId: number) => {
                addLog(`[INFO] Conectando via WebSocket direto com App ID ${cleanAppId}...`, "INFO");
                const socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(cleanAppId)}`);
                ws.current = socket;

                setupSocketListeners(socket, connId, cleanToken, cleanAppId, accountType);

                socket.onopen = () => {
                    if (connectionId.current !== connId || ws.current !== socket) return;
                    addLog("[INFO] WebSocket aberto. Autenticando...", "INFO");
                    socket.send(JSON.stringify({ authorize: cleanToken }));
                };
            };

            // Se for aplicativo de celular, ignoramos a API REST (que bloqueia por CORS/Origin)
            // e conectamos diretamente via WebSocket, que aceita conexões de qualquer origem.
            if (isMobileApp) {
                addLog("[SISTEMA] Ambiente mobile detectado. Forçando conexão direta via WebSocket para evitar bloqueios de CORS.", "INFO");
                openDirectAuthorizedSocket(currentConnectionId);
            } else if (isPatToken) {
                try {
                    addLog(`[INFO] Validando PAT com App ID ${cleanAppId}...`, "INFO");
                    const accounts = await getDerivAccounts(cleanToken, cleanAppId);
                    if (connectionId.current !== currentConnectionId) return;

                    const accountList = accounts.map(a => `${a.account_id}(${a.account_type}/${a.currency})`).join(', ');
                    addLog(`[INFO] Contas encontradas: ${accountList}`, "INFO");

                    const selectedAccount = selectAccount(accounts, accountType);

                    if (!selectedAccount) {
                        throw new Error(`Nenhuma conta ${accountType === 'real' ? 'real' : 'demo'} foi encontrada nesse PAT.`);
                    }

                    const matchedType = selectedAccount.account_type === accountType || (accountType === 'demo' && selectedAccount.is_virtual === true);
                    if (!matchedType && accounts.length > 1) {
                        addLog(`[AVISO] Nenhuma conta ${accountType} encontrada. Usando conta ${selectedAccount.account_type} ${selectedAccount.account_id} como fallback.`, "ERROR");
                    }

                    addLog(`[INFO] Conta ${selectedAccount.account_id} (${selectedAccount.account_type}/${selectedAccount.currency}) selecionada. Gerando link seguro...`, "INFO");
                    const wsUrl = await getDerivOtpUrl(cleanToken, selectedAccount.account_id, cleanAppId);
                    if (connectionId.current !== currentConnectionId) return;

                    const socket = new WebSocket(wsUrl);
                    ws.current = socket;

                    setupSocketListeners(socket, currentConnectionId, cleanToken, cleanAppId, accountType);

                    socket.onopen = () => {
                        if (connectionId.current !== currentConnectionId || ws.current !== socket) return;
                        setIsConnected(true);
                        setIsConnecting(false);
                        setStatus({ message: 'Link Estável', color: 'bg-emerald-500' });
                        setAccountBalance(selectedAccount.balance);
                        setAccountId(selectedAccount.account_id);
                        setCurrency(selectedAccount.currency);
                        addLog(`[SUCESSO] Conectado via PAT à conta ${selectedAccount.account_id}`, "TRADE");
                        startPing();
                        socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                    };
                } catch (patError: any) {
                    addLog(`[AVISO] ${patError?.message || "Falha ao usar PAT na API nova."}`, "ERROR");
                    addLog("[INFO] Tentando fallback por WebSocket direto...", "INFO");
                    openDirectAuthorizedSocket(currentConnectionId);
                }
            } else {
                openDirectAuthorizedSocket(currentConnectionId);
            }
        } catch (error: any) {
            setIsConnected(false);
            setIsConnecting(false);
            setStatus({ message: 'Falha de Link', color: 'bg-red-500' });
            addLog(`[ERRO] ${error?.message || "Erro desconhecido ao conectar."}`, "ERROR");
        }
    }, [setStatus, setIsConnected, setIsConnecting, setAccountBalance, setAccountId, addLog, clearPing, setupSocketListeners, setCurrency, startPing]);

    return useMemo(() => ({
        isConnected,
        status,
        connectWithToken,
        disconnect,
        sendMessage: (payload: any) => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(payload));
            }
        },
        wsRef: ws,
    }), [isConnected, status, connectWithToken, disconnect]);
};