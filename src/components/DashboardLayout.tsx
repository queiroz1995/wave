"use client";

import React, { useState } from 'react';
import { BarChart } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useBotContext } from '@/context/BotContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperationLog } from '@/components/bot/OperationLog';
import { TradeHistory } from '@/components/bot/TradeHistory';
import { SequenceAnalyzer } from '@/components/bot/SequenceAnalyzer';
import { ClosedHistory } from '@/components/bot/ClosedHistory';
import { Cataloger } from '@/components/bot/Cataloger';
import { useIsMobile } from '@/hooks/use-mobile';
import { FunctionGuideModal } from '@/components/bot/FunctionGuideModal';
import { Separator } from '@/components/ui/separator';
import { SettingsSheet } from '@/components/bot/SettingsSheet';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { totalProfit, accountBalance, wins, losses } = useBotContext();
    const isMobile = useIsMobile(1024); // lg breakpoint
    const [activeTab, setActiveTab] = useState("operations");

    const tabTriggerClasses = "text-sm px-4 py-2 justify-start w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

    const tabs = [
        { value: "operations", label: "Operações" },
        { value: "results", label: "Histórico" },
        { value: "analyzer", label: "Analisador" },
        { value: "cataloger", label: "Catalogador" },
        { value: "closed-history", label: "Hist. Fechado" },
    ];

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const renderTabContent = () => (
        <>
            <TabsContent value="operations" className="h-full mt-0"><OperationLog /></TabsContent>
            <TabsContent value="results" className="h-full mt-0"><TradeHistory /></TabsContent>
            <TabsContent value="analyzer" className="h-full mt-0"><SequenceAnalyzer /></TabsContent>
            <TabsContent value="cataloger" className="h-full mt-0"><Cataloger /></TabsContent>
            <TabsContent value="closed-history" className="h-full mt-0"><ClosedHistory /></TabsContent>
        </>
    );

    return (
        <div className="container mx-auto p-2 sm:p-4 min-h-screen flex flex-col">
            <header className="w-full flex justify-between items-center py-4 border-b bg-card/50 backdrop-blur-sm rounded-lg px-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold">
                        Rico 2.0
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
                            <p className="text-xs text-muted-foreground">ASSERTIVIDADE</p>
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
                    {isMobile ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                            <div className="flex-grow min-h-0">
                                {renderTabContent()}
                            </div>
                        </Tabs>
                    ) : (
                        <Tabs defaultValue="operations" orientation="vertical" className="w-full h-full grid grid-cols-4">
                            <TabsList className="col-span-1 flex flex-col h-auto items-start gap-1 bg-transparent p-0 pr-4">
                                {tabs.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClasses}>{tab.label}</TabsTrigger>
                                ))}
                            </TabsList>
                            <div className="col-span-3 h-full">
                                {renderTabContent()}
                            </div>
                        </Tabs>
                    )}
                </div>
            </main>
        </div>
    );
};