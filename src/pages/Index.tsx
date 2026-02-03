"use client";
import React from 'react';
import { GamePanel } from '@/components/bot/GamePanel';
import { ConnectionPanel } from '@/components/bot/ConnectionPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
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
    </DashboardLayout>
  );
};

export default IndexPage;