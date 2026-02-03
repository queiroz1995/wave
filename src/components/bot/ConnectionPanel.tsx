"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Power, PowerOff, DollarSign } from 'lucide-react';
import { useBotContext } from '@/context/BotContext';

export const ConnectionPanel: React.FC = () => {
    const {
        realToken, setRealToken,
        demoToken, setDemoToken,
        accountType, setAccountType,
        handleConnect, handleDisconnect,
        isConnected, status,
        accountBalance,
    } = useBotContext();

    const currentToken = accountType === 'real' ? realToken : demoToken;

    const handleAccountTypeChange = (value: 'real' | 'demo') => {
        setAccountType(value); 
        // Apenas troca o tipo, a conexão é feita no botão "Conectar"
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
                        className="flex-1 font-bold"
                    >
                        {isConnected ? (
                            <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                <span>Desconectar</span>
                            </>
                        ) : (
                            <>
                                <Power className="h-4 w-4 mr-2" />
                                <span>Conectar Conta</span>
                            </>
                        )}
                    </Button>
                </div>
                
                {isConnected && (
                    <div className="text-center pt-4 border-t border-primary/10">
                        <Label className="text-xs text-muted-foreground uppercase font-bold">Saldo da Conta</Label>
                        <p className="text-2xl font-black text-primary flex items-center justify-center gap-2">
                            <DollarSign className="h-6 w-6" />
                            {accountBalance?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-center space-x-2 pt-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${status.color} transition-all animate-pulse`}></span>
                    <span className="font-medium text-muted-foreground">{status.message}</span>
                </div>
            </CardContent>
        </Card>
    );
};