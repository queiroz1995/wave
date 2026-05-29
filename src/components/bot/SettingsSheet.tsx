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
import { BankManagement } from '@/components/bot/BankManagement';
import { useBotContext } from '@/context/BotContext';

interface SettingsSheetProps {
    trigger?: React.ReactNode;
}

export const SettingsSheet = ({ trigger }: SettingsSheetProps) => {
    const { isSettingsOpen, setIsSettingsOpen } = useBotContext();

    return (
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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
                    <SheetTitle>Painel de Gestão</SheetTitle>
                    <SheetDescription>
                        Planeje seu dia e acompanhe seu progresso na planilha de gestão.
                    </SheetDescription>
                </SheetHeader>
                
                <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        <BankManagement />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};