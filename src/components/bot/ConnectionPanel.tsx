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
        <div className="w-full flex flex-col sm:flex-row items-center gap-3 bg-slate-950/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] mb-4 transition-all duration-300 hover:border-cyan-500/30">
            {/* Seletor de Conta e Status */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Select value={accountType} onValueChange={handleAccountTypeChange} disabled={isConnecting}>
                    <SelectTrigger className="h-9 w-[100px] text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 bg-slate-900/60 text-white hover:bg-slate-800/80 transition-colors">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                        <SelectItem value="demo" className="focus:bg-cyan-500/20 focus:text-white">Demo</SelectItem>
                        <SelectItem value="real" className="focus:bg-cyan-500/20 focus:text-white">Real</SelectItem>
                    </SelectContent>
                </Select>
                <div className={cn(
                    "h-2.5 w-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
                    status.color === "bg-emerald-500" ? "text-emerald-400 bg-emerald-400" : "text-rose-400 bg-rose-400"
                )} />
            </div>

            {/* Input de Token - Compacto */}
            <div className="relative flex-grow w-full">
                <Input 
                    type="password" 
                    value={currentToken} 
                    onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)} 
                    placeholder="Token API" 
                    disabled={isConnected || isConnecting} 
                    className="h-9 text-[11px] font-mono pr-10 rounded-xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
                {!isConnected && !isConnecting && (
                    <Button 
                        onClick={() => handleConnect()} 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent text-cyan-400 hover:text-cyan-300"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Botão de Conexão e Saldo */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {isConnected && accountBalance !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                        <Wallet className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[11px] font-black text-cyan-400">${accountBalance.toFixed(2)}</span>
                    </div>
                )}
                
                <Button 
                    onClick={isConnected ? handleDisconnect : () => handleConnect(accountType, currentToken)} 
                    variant={isConnected ? "destructive" : "default"}
                    disabled={isConnecting}
                    className={cn(
                        "h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none min-w-[110px] transition-all duration-300",
                        isConnected 
                            ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30" 
                            : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    )}
                >
                    {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    ) : isConnected ? (
                        <PowerOff className="h-3.5 w-3.5" />
                    ) : (
                        <Power className="h-3.5 w-3.5 mr-2" />
                    )}
                    <span className={cn(isConnected && !isConnecting && "sr-only")}>
                        {isConnecting ? "Aguarde..." : isConnected ? "OFF" : "Conectar"}
                    </span>
                </Button>
            </div>
        </div>
    );
};