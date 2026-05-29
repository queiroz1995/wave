"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, RotateCcw, Wallet, Loader2 } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';
import { cn } from '@/lib/utils';

export const ConnectionPanel: React.FC = () => {
    const {
        realToken, setRealToken,
        demoToken, setDemoToken,
        accountType, setAccountType,
        handleConnect, handleDisconnect,
        isConnected, isConnecting, status,
        accountBalance,
    } = useBotContext();

    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleAccountTypeChange = (value: 'real' | 'demo') => {
        setAccountType(value);
        const tokenToUse = value === 'real' ? realToken : demoToken;
        if (tokenToUse) handleConnect(value, tokenToUse);
    };

    return (
        <div className="w-full flex flex-col gap-2 bg-slate-950/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-cyan-500/30">
            {/* Linha Superior: Seletor de Conta, Status e Saldo */}
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                    <Select value={accountType} onValueChange={handleAccountTypeChange} disabled={isConnecting}>
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
                </div>

                {isConnected && accountBalance !== null && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                        <Wallet className="h-3 w-3 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400">${accountBalance.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Linha Inferior: Input de Token e Botão de Conexão */}
            <div className="flex items-center gap-2 w-full">
                <div className="relative flex-grow">
                    <Input 
                        type="password" 
                        value={currentToken} 
                        onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)} 
                        placeholder="Token API" 
                        disabled={isConnected || isConnecting} 
                        className="h-8 text-[10px] font-mono pr-8 rounded-lg border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                    />
                    {!isConnected && !isConnecting && (
                        <Button 
                            onClick={() => handleConnect()} 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent text-cyan-400 hover:text-cyan-300"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <Button 
                    onClick={isConnected ? handleDisconnect : () => handleConnect(accountType, currentToken)} 
                    variant={isConnected ? "destructive" : "default"}
                    disabled={isConnecting}
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
                        <PowerOff className="h-3 w-3" />
                    ) : (
                        <Power className="h-3 w-3 mr-1" />
                    )}
                    <span className={cn(isConnected && !isConnecting && "sr-only", "ml-1")}>
                        {isConnecting ? "..." : isConnected ? "OFF" : "Ligar"}
                    </span>
                </Button>
            </div>
        </div>
    );
};