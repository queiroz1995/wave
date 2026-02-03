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
import { BankManagement } from '@/components/bot/BankManagement';

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
                        Ajuste os parâmetros de banca e gerenciamento.
                    </SheetDescription>
                </SheetHeader>
                
                <Tabs defaultValue="bank" className="w-full flex flex-col flex-grow min-h-0">
                    <div className="p-6 pt-0 pb-4 border-b bg-card sticky top-0 z-10">
                        <TabsList className="grid w-full grid-cols-1 h-auto">
                            <TabsTrigger value="bank">Gerenciamento de Banca</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="p-6 pt-0">
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