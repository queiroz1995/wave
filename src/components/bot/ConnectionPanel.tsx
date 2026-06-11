"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, Wallet, Loader2, Eye, EyeOff, KeyRound, Hash, User, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

export const ConnectionPanel: React.FC = () => {
    const {
        realToken, setRealToken,
        demoToken, setDemoToken,
        accountId, setAccountId,
        accountType, setAccountType,
        handleConnect, handleDisconnect,
        isConnected, isConnecting, status,
        accountBalance, loginid, currency,
        logs,
    } = useBotContext();

    const [showMessages, setShowMessages] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const [showToken, setShowToken] = useState(false);

    const currentToken = accountType === 'real' ? realToken : demoToken;
    const isPAT = currentToken.startsWith('pat_');
    const isOAuth = !isPAT && currentToken.length >= 3 && /^[A-Za-z]{2,3}[0-9]/.test(currentToken); // ROT..., VRT..., etc

    const handleAccountTypeChange = (value: 'real' | 'demo') => {
        setAccountType(value);
    };

    const handleConnectClick = () => {
        handleConnect(accountType, currentToken);
    };

    // Auto-scroll para o último log
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="w-full flex flex-col gap-2 bg-slate-950/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-cyan-500/30">

            {/* Linha Superior: Seletor, status e botao */}
            <div className="flex items-center gap-2 w-full">
                <Select value={accountType} onValueChange={handleAccountTypeChange} disabled={isConnected || isConnecting}>
                    <SelectTrigger className="h-8 w-[85px] text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10 bg-slate-900/60 text-white hover:bg-slate-800/80 transition-colors shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                        <SelectItem value="demo" className="focus:bg-cyan-500/20 focus:text-white text-[10px]">Demo</SelectItem>
                        <SelectItem value="real" className="focus:bg-cyan-500/20 focus:text-white text-[10px]">Real</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={cn(
                        "h-2 w-2 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_currentColor]",
                        status.color === "bg-emerald-500" ? "text-emerald-400 bg-emerald-400" : "text-rose-400 bg-rose-400"
                    )} />
                    {isPAT && !isConnected && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            PAT
                        </span>
                    )}
                    {isOAuth && !isConnected && currentToken.length > 0 && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            {currentToken.substring(0, 3).toUpperCase()}
                        </span>
                    )}
                    {accountType === 'real' && !isConnected && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            REAL
                        </span>
                    )}
                </div>

                <Button
                    onClick={isConnected ? handleDisconnect : handleConnectClick}
                    variant={isConnected ? "destructive" : "default"}
                    disabled={isConnecting || (!isConnected && !currentToken.trim())}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 transition-all duration-300",
                        isConnected
                            ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30"
                            : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    )}
                >
                    {isConnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isConnected ? (
                        <><PowerOff className="h-3 w-3" /><span className="ml-1">Sair</span></>
                    ) : (
                        <><Power className="h-3 w-3" /><span className="ml-1">Ligar</span></>
                    )}
                </Button>
            </div>

            {/* Painel de info quando conectado: saldo + loginid + moeda */}
            {isConnected && (
                <div className="flex items-center gap-2 w-full">
                    {/* Saldo */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex-1">
                        <Wallet className="h-3 w-3 text-emerald-400 shrink-0" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[8px] text-emerald-400/60 uppercase tracking-widest font-bold">Saldo</span>
                            <span className="text-[11px] font-black text-emerald-400">
                                {accountBalance !== null
                                    ? `${accountBalance.toFixed(2)} ${currency ?? ''}`
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Login ID */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex-1">
                        <User className="h-3 w-3 text-cyan-400 shrink-0" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[8px] text-cyan-400/60 uppercase tracking-widest font-bold">ID Deriv</span>
                            <span className="text-[11px] font-black text-cyan-400">{loginid ?? '—'}</span>
                        </div>
                    </div>

                    {/* Tipo de conta */}
                    <div className={cn(
                        "flex items-center px-2.5 py-1.5 rounded-lg border shrink-0",
                        accountType === 'real'
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "bg-slate-700/30 border-white/10"
                    )}>
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            accountType === 'real' ? "text-amber-400" : "text-slate-400"
                        )}>
                            {accountType === 'real' ? 'REAL' : 'DEMO'}
                        </span>
                    </div>
                </div>
            )}

            {/* Campo do Token API */}
            {!isConnected && (
                <>
                    <div className="flex items-center gap-2 w-full">
                        <div className="relative flex-grow">
                            <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                            <Input
                                type={showToken ? "text" : "password"}
                                value={currentToken}
                                onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)}
                                placeholder={accountType === 'real' ? 'Token Real (ROT... / pat_... / API)' : 'Token Demo (VRT... / pat_... / API)'}
                                disabled={isConnecting}
                                className="h-8 text-[10px] font-mono pl-7 pr-8 rounded-lg border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                            />
                            <Button
                                onClick={() => setShowToken(v => !v)}
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent text-slate-500 hover:text-cyan-300"
                                tabIndex={-1}
                            >
                                {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Campo de ID da Conta */}
                    <div className="relative w-full">
                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                        <Input
                            type="text"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="Login ID Deriv (ex: ROT91670562, CR123456, VR...)"
                            disabled={isConnecting}
                            className="h-8 text-[10px] font-mono pl-7 rounded-lg border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                        />
                    </div>
                </>
            )}

            {/* Painel de Mensagens e Status */}
            {(isConnecting || logs.length > 0) && (
                <div className="w-full border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/80 border-b border-white/10">
                        <button
                            onClick={() => setShowMessages(!showMessages)}
                            className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <Info className="h-3 w-3" />
                            Mensagens {isConnecting && '(conectando...)'}
                        </button>
                        <span className="text-[8px] text-slate-500">
                            {logs.length} evento{logs.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {showMessages && (
                        <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1 p-2">
                            {logs.length === 0 ? (
                                <div className="text-[8px] text-slate-500 py-2">Nenhuma mensagem ainda...</div>
                            ) : (
                                logs.slice(-8).map((log, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "text-[8px] px-1.5 py-1 rounded flex items-start gap-1.5 font-mono",
                                            log.type === 'error'
                                                ? "bg-red-500/10 text-red-300 border border-red-500/20"
                                                : log.type === 'success'
                                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                                : log.type === 'info'
                                                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                                : "bg-slate-700/30 text-slate-300 border border-white/10"
                                        )}
                                    >
                                        <span className="shrink-0 mt-0.5">
                                            {log.type === 'error' ? (
                                                <AlertCircle className="h-2.5 w-2.5" />
                                            ) : log.type === 'success' ? (
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                            ) : (
                                                <Info className="h-2.5 w-2.5" />
                                            )}
                                        </span>
                                        <span className="break-words flex-1">{log.message}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
