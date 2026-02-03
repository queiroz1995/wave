"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, DollarSign, RotateCcw } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';

export const ConnectionPanel: React.FC = () => {
    const {
        realToken, setRealToken,
        demoToken, setDemoToken,
        accountType, setAccountType,
        handleConnect, handleDisconnect,
        isConnected, status,
        accountBalance,
        addLog,
    } = useBotContext();

    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleAccountTypeChange = (value: 'real' | 'demo') => {
        setAccountType(value); 
        const tokenToUse = value === 'real' ? realToken : demoToken;
        handleConnect(value, tokenToUse);
    };

    const handleSynchronize = () => {
        if (!currentToken) {
            addLog("Token de acesso vazio. Por favor, insira o token antes de sincronizar.", 'ERROR');
            return;
        }
        handleConnect();
    };

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select value={accountType} onValueChange={handleAccountTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="demo">Demo</SelectItem>
                            <SelectItem value="real">Real</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="token-input">Token de Acesso</Label>
                    <Input 
                        id="token-input" 
                        type="password" 
                        value={currentToken} 
                        onChange={(e) => accountType === 'real' ? setRealToken(e.target.value) : setDemoToken(e.target.value)} 
                        placeholder="Insira seu token aqui" 
                        disabled={isConnected} 
                    />
                </div>
                
                <div className="flex gap-2">
                    <Button 
                        onClick={isConnected ? handleDisconnect : () => handleConnect(accountType, currentToken)} 
                        variant={isConnected ? "destructive" : "default"}
                        className="flex-1"
                    >
                        {isConnected ? (
                            <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                <span>Desconectar</span>
                            </>
                        ) : (
                            <>
                                <Power className="h-4 w-4 mr-2" />
                                <span>Conectar</span>
                            </>
                        )}
                    </Button>
                    
                    {!isConnected && (
                        <Button 
                            onClick={handleSynchronize} 
                            variant="outline"
                            size="icon"
                            className="flex-shrink-0"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="sr-only">Sincronizar</span>
                        </Button>
                    )}
                </div>
                
                {isConnected && (
                    <div className="text-center pt-4 border-t">
                        <Label>Saldo da Conta</Label>
                        <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                            <DollarSign className="h-6 w-6" />
                            {accountBalance?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-center space-x-2 pt-2 text-sm">
                    <span className={`h-3 w-3 rounded-full ${status.color} transition-all animate-pulse`}></span>
                    <span>{status.message}</span>
                </div>
            </CardContent>
        </Card>
    );
};