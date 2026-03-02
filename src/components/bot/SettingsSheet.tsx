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

interface SettingsSheetProps {
    trigger?: React.ReactNode;
}

export const SettingsSheet = ({ trigger }: SettingsSheetProps) => {
    return (
        <Sheet>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Configurações</span>
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle>Configurações Avançadas</SheetTitle>
                    <SheetDescription>
                        Ajuste todos os parâmetros do bot aqui. As alterações são salvas automaticamente.
                    </SheetDescription>
                </SheetHeader>
                
                <Tabs defaultValue="trade-params" className="w-full flex flex-col flex-grow min-h-0">
                    <div className="p-6 pt-0 pb-4 border-b bg-card sticky top-0 z-10">
                        <TabsList className="grid w-full grid-cols-4 h-auto">
                            <TabsTrigger value="trade-params">Trade</TabsTrigger>
                            <TabsTrigger value="risk">Risco</TabsTrigger>
                            <TabsTrigger value="bank">Banca</TabsTrigger>
                            <TabsTrigger value="strategies">Estratégias</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="p-6 pt-0">
                            <TabsContent value="trade-params" className="mt-0"><TradeParameters /></TabsContent>
                            <TabsContent value="risk" className="mt-0"><RiskManagement /></TabsContent>
                            <TabsContent value="bank" className="mt-0"><BankManagement /></TabsContent>
                            <TabsContent value="strategies" className="mt-0"><StrategySettings /></TabsContent>
                        </div>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
};