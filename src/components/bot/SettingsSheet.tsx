"use client";

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskManagement } from '@/components/bot/RiskManagement';
import { BankManagement } from '@/components/bot/BankManagement';
import { TradeParameters } from '@/components/bot/TradeParameters';
import { StrategySettings } from '@/components/bot/StrategySettings';

export const SettingsSheet = () => {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Configurações</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle>Configurações Rico 2.0</SheetTitle>
                    <SheetDescription>
                        Ajuste os parâmetros essenciais para suas operações.
                    </SheetDescription>
                </SheetHeader>
                
                <Tabs defaultValue="geral" className="w-full flex flex-col flex-grow min-h-0">
                    <div className="p-6 pt-0 pb-4 border-b bg-card sticky top-0 z-10">
                        <TabsList className="grid w-full grid-cols-3 h-auto">
                            <TabsTrigger value="geral">Geral</TabsTrigger>
                            <TabsTrigger value="estrat">Lógica</TabsTrigger>
                            <TabsTrigger value="bank">Banca</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="p-6 pt-0">
                            <TabsContent value="geral" className="mt-0 space-y-6">
                                <TradeParameters />
                                <RiskManagement />
                            </TabsContent>
                            <TabsContent value="estrat" className="mt-0">
                                <StrategySettings />
                            </TabsContent>
                            <TabsContent value="bank" className="mt-0">
                                <BankManagement />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
};