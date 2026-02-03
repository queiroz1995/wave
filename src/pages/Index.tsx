"use client";
import React from 'react';
import { ConnectionPanel } from '@/components/bot/ConnectionPanel';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RouletteMode } from '@/components/bot/RouletteMode';

const IndexPage = () => {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ConnectionPanel />
        <RouletteMode />
      </div>
    </DashboardLayout>
  );
};

export default IndexPage;