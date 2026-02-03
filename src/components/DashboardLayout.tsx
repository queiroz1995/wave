"use client";

import React, { useState } from 'react';
import { BarChart } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBotContext } from '@/context/BotContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperationLog } from '@/components/bot/OperationLog';
import { TradeHistory } from '@/components/bot/TradeHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { FunctionGuideModal } from '@/components/bot/FunctionGuideModal';
import { Separator } from '@/components/ui/separator';
import { SettingsSheet } from '@/components/bot/SettingsSheet';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { totalProfit, accountBalance, wins, losses } = useBotContext();
    const isMobile = useIsMobile(1024);
    const [activeTab, setActiveTab] = useState("operations");

    const tabs = [
        { value: "operations", label: "Operações" },
        { value: "results", label: "Histórico" },
    ];

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return (
        <div className="container mx-auto p-2 sm:p-4 min-h-screen flex flex-col">
            <header className="w-full flex justify-between items-center py-4 border-b bg-card/50 backdrop-blur-sm rounded-lg px-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold">
                        Rico 2.0 (Modo Roleta)
                    </h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden lg:flex items-center gap-3 sm:gap-4 rounded-md border p-2 px-3 bg-background/50">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">LUCRO</p>
                            <p className={`font-bold ${totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : ''}`}>${totalProfit.toFixed(2)}</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">WIN RATE</p>
                            <p className={`font-bold ${winRate >= 50 ? 'text-green-500' : totalTrades > 0 ? 'text-red-500' : ''}`}>
                                {winRate.toFixed(1)}%
                            </p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">SALDO</p>
                            <p className="font-bold text-primary">${accountBalance?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>

                    <SettingsSheet />
                    <FunctionGuideModal />
                    <ThemeToggle />
                </div>
            </header>
            
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-grow">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    {children}
                </div>

                <div className="lg:col-span-1 min-h-[400px] lg:h-[calc(100dvh-150px)]">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                        {!isMobile && (
                            <TabsList className="flex w-full mb-4 bg-muted/50 p-1">
                                {tabs.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="flex-1">{tab.label}</TabsTrigger>
                                ))}
                            </TabsList>
                        )}
                        <div className="flex-grow min-h-0">
                            <TabsContent value="operations" className="h-full mt-0"><OperationLog /></TabsContent>
                            <TabsContent value="results" className="h-full mt-0"><TradeHistory /></TabsContent>
                        </div>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};