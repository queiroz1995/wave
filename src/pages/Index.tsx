"use client";
import React from 'react';
import { ConnectionPanel } from '@/components/bot/ConnectionPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RouletteMode } from '@/components/bot/RouletteMode';
import { RouletteHistory } from '@/components/bot/RouletteHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, History } from 'lucide-react';

const IndexPage = () => {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
            <ConnectionPanel />
        </div>
        
        <div className="lg:col-span-2">
            <Tabs defaultValue="game" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 h-12">
                    <TabsTrigger value="game" className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Gamepad2 className="h-4 w-4" />
                        Operação
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <History className="h-4 w-4" />
                        Histórico & Análise
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="game" className="mt-0">
                    <RouletteMode />
                </TabsContent>
                
                <TabsContent value="history" className="mt-0">
                    <RouletteHistory />
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IndexPage;