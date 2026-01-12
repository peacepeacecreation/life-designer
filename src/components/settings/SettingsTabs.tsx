'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Clock, Link } from 'lucide-react';
import UserSettingsTab from '@/components/settings/UserSettingsTab';
import TimeManagerTab from '@/components/settings/TimeManagerTab';
import ClockifyIntegrationTab from '@/components/settings/ClockifyIntegrationTab';

export default function SettingsTabs() {
  return (
    <Tabs defaultValue="time-manager" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="user" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Користувач
        </TabsTrigger>
        <TabsTrigger value="time-manager" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Manager
        </TabsTrigger>
        <TabsTrigger value="clockify" className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Clockify
        </TabsTrigger>
      </TabsList>

      <TabsContent value="user">
        <UserSettingsTab />
      </TabsContent>

      <TabsContent value="time-manager">
        <TimeManagerTab />
      </TabsContent>

      <TabsContent value="clockify">
        <ClockifyIntegrationTab />
      </TabsContent>
    </Tabs>
  );
}
