"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, Wallet, Loader2, Eye, EyeOff, KeyRound, Hash } from 'lucide-react';
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
        accountBalance,
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
            {/* Linha Superior: Seletor de Conta, Status e Saldo */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                    <Select value={accountType} onValueChange={handleAccountTypeChange} disabled={isConnected || isConnecting}>
                        <SelectTrigger className="h-8 w-[85px] text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10 bg-slate-900/60 text-white hover:bg-slate-800/80 transition-colors">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10 text-white">
                            <SelectItem value="demo" className="focus:bg-cyan-500/20 focus:text-white text-[10px]">Demo</SelectItem>
                            <SelectItem value="real" className="focus:bg-cyan-500/20 focus:text-white text-[10px]">Real</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
                        status.color === "bg-emerald-500" ? "text-emerald-400 bg-emerald-400" : "text-rose-400 bg-rose-400"
                    )} />
                    {isPAT && !isConnected && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md">
                            PAT
                        </span>
                    )}
                </div>

                {isConnected && accountBalance !== null && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                        <Wallet className="h-3 w-3 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400">${accountBalance.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Campo do Token API */}
            <div className="flex items-center gap-2 w-full">
                <div className="relative flex-grow">
                    <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                    <Input
                        type={showToken ? "text" : "password"}
                        value={currentToken}
                        onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)}
                        placeholder="pat_... ou Token API"
                        disabled={isConnected || isConnecting}
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

                <Button
                    onClick={isConnected ? handleDisconnect : handleConnectClick}
                    variant={isConnected ? "destructive" : "default"}
                    disabled={isConnecting || (!isConnected && !currentToken.trim())}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest min-w-[80px] transition-all duration-300",
                        isConnected
                            ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30"
                            : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    )}
                >
                    {isConnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isConnected ? (
                        <><PowerOff className="h-3 w-3" /><span className="ml-1">OFF</span></>
                    ) : (
                        <><Power className="h-3 w-3" /><span className="ml-1">Ligar</span></>
                    )}
                </Button>
            </div>

            {/* Campo de ID de Conta (somente para PAT ou sempre visível para facilitar) */}
            <div className="relative w-full">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                <Input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="ID da Conta (ex: CR123456) — opcional para PAT"
                    disabled={isConnected || isConnecting}
                    className="h-8 text-[10px] font-mono pl-7 rounded-lg border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
            </div>
        </div>
    );
};
