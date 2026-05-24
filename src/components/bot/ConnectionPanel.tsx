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
        <div className="w-full flex flex-col sm:flex-row items-center gap-2 bg-white/40 backdrop-blur-md border border-white/60 p-2 px-3 rounded-2xl shadow-sm mb-4">
            {/* Seletor de Conta e Status */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={accountType} onValueChange={handleAccountTypeChange} disabled={isConnecting}>
                    <SelectTrigger className="h-8 w-[90px] text-[10px] font-black uppercase tracking-widest rounded-xl border-none bg-white/50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="demo">Demo</SelectItem>
                        <SelectItem value="real">Real</SelectItem>
                    </SelectContent>
                </Select>
                <div className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    status.color
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
                    className="h-8 text-[11px] font-mono pr-8 rounded-xl border-none bg-white/50 focus-visible:ring-primary/30"
                />
                {!isConnected && !isConnecting && (
                    <Button 
                        onClick={() => handleConnect()} 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent text-primary"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Botão de Conexão e Saldo */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {isConnected && accountBalance !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-xl">
                        <Wallet className="h-3 w-3 text-primary" />
                        <span className="text-[11px] font-black text-primary">${accountBalance.toFixed(2)}</span>
                    </div>
                )}
                
                <Button 
                    onClick={isConnected ? handleDisconnect : () => handleConnect(accountType, currentToken)} 
                    variant={isConnected ? "destructive" : "default"}
                    disabled={isConnecting}
                    className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none min-w-[100px]"
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