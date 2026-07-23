"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Power, PowerOff, Wallet, Loader2, KeyRound, User, Info, Eye, EyeOff } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DerivDiagnosticTool } from './DerivDiagnosticTool';

export const ConnectionPanel: React.FC = () => {
    const {
        accountType, setAccountType,
        realToken, setRealToken,
        demoToken, setDemoToken,
        handleConnect, handleDisconnect,
        isConnected, isConnecting, status,
        accountBalance, accountId
    } = useBotContext();

    const [showToken, setShowToken] = useState(false);
    const currentToken = accountType === 'real' ? realToken : demoToken;

    return (
        <div className="w-full flex flex-col gap-3 bg-slate-950/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acesso Seguro Deriv</span>
                    <DerivDiagnosticTool />
                </div>
                {isConnected && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px]">
                        Sessão Ativa
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2 w-full">
                <Select value={accountType} onValueChange={(v: any) => setAccountType(v)} disabled={isConnected || isConnecting}>
                    <SelectTrigger className="h-9 w-[100px] text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10 bg-slate-900/60">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                        <SelectItem value="demo" className="text-[10px]">Demo</SelectItem>
                        <SelectItem value="real" className="text-[10px]">Real</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn(
                        "h-2 w-2 rounded-full animate-pulse flex-shrink-0",
                        status.color === "bg-emerald-500" ? "bg-emerald-400" : "bg-rose-400"
                    )} />
                    <span className="text-[9px] font-black uppercase text-slate-400 truncate">
                        {status.message}
                    </span>
                </div>

                <Button
                    onClick={() => isConnected ? handleDisconnect() : handleConnect()}
                    disabled={isConnecting || (!isConnected && !currentToken.trim())}
                    className={cn(
                        "h-9 px-4 rounded-lg text-[10px] font-black uppercase transition-all",
                        isConnected ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-cyan-500 text-slate-950"
                    )}
                >
                    {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                        <><PowerOff className="h-3.5 w-3.5 mr-1.5" /> Desconectar</>
                    ) : (
                        <><Power className="h-3.5 w-3.5 mr-1.5" /> Conectar</>
                    )}
                </Button>
            </div>

            {!isConnected ? (
                <div className="space-y-3">
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            type={showToken ? "text" : "password"}
                            value={currentToken}
                            onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)}
                            placeholder="Insira seu Token da Deriv"
                            className="h-10 text-base pl-9 pr-10 rounded-xl bg-slate-900/40 border-white/10 focus-visible:ring-cyan-500/30"
                        />
                        <Button
                            onClick={() => setShowToken(!showToken)}
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500"
                        >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="px-3 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-[8px] text-cyan-300 font-bold uppercase tracking-wider leading-relaxed">
                            O App ID já está configurado automaticamente. Insira apenas o seu Token PAT (começando com pat_).
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Saldo</span>
                            <span className="text-[11px] font-black text-emerald-400">
                                ${accountBalance?.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                        <User className="h-3.5 w-3.5 text-cyan-400" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase">ID Conta</span>
                            <span className="text-[11px] font-black text-cyan-400 truncate">{accountId}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};