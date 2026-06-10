"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, Wallet, Loader2, Eye, EyeOff, KeyRound, Hash, User } from 'lucide-react';
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
    } = useBotContext();

    const [showToken, setShowToken] = useState(false);

    const currentToken = accountType === 'real' ? realToken : demoToken;
    const isPAT = currentToken.startsWith('pat_');

    const handleAccountTypeChange = (value: 'real' | 'demo') => {
        setAccountType(value);
    };

    const handleConnectClick = () => {
        handleConnect(accountType, currentToken);
    };

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
                                placeholder={accountType === 'real' ? 'Token Real (pat_... ou API)' : 'Token Demo (pat_... ou API)'}
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
                            placeholder="ID da Conta (ex: CR123456) — opcional para PAT"
                            disabled={isConnecting}
                            className="h-8 text-[10px] font-mono pl-7 rounded-lg border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                        />
                    </div>
                </>
            )}
        </div>
    );
};
