"use client";
import React from 'react';
import { GamePanel } from '@/components/bot/GamePanel';
import { ConnectionPanel } from '@/components/bot/ConnectionPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DigitStream } from '@/components/bot/DigitStream';
import { Card, CardContent } from '@/components/ui/card';
import { DigitStats } from '@/components/bot/DigitStats';
import { RouletteMode } from '@/components/bot/RouletteMode';
import { useBotContext } from '@/context/BotContext';

const IndexPage = () => {
  const { isRouletteMode } = useBotContext();

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ConnectionPanel />
        {isRouletteMode ? <RouletteMode /> : <GamePanel />}
      </div>
      
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