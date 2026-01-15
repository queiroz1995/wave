"use client";
import React from 'react';
import { GamePanel } from '@/components/bot/GamePanel';
import { ConnectionPanel } from '@/components/bot/ConnectionPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DigitStream } from '@/components/bot/DigitStream';
import { Card, CardContent } from '@/components/ui/card';
import { DigitStats } from '@/components/bot/DigitStats';
import { VirtualLossDisplay } from '@/components/bot/VirtualLossDisplay';
import { LogicStatePanel } from '@/components/bot/LogicStatePanel';

const IndexPage = () => {
  return (
    <DashboardLayout>
      {/* Indicador de Virtual Loss no topo quando o bot estiver rodando */}
      <VirtualLossDisplay />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ConnectionPanel />
        <GamePanel />
      </div>

      <LogicStatePanel />
      
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <DigitStream />
          <DigitStats />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default IndexPage;