"use client";
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useBotContext } from '@/context/BotContext';
import { AILandingPage } from '@/components/bot/AILandingPage';
import { AIOperatingScreen } from '@/components/bot/AIOperatingScreen';

const IndexPage = () => {
  const { appFlow } = useBotContext();

  return (
    <DashboardLayout>
      {appFlow === 'selection' ? (
        <AILandingPage />
      ) : (
        <AIOperatingScreen />
      )}
    </DashboardLayout>
  );
};

export default IndexPage;