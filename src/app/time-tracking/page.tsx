'use client';

import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimeStatsCharts from '@/components/time-tracking/TimeStatsCharts';
import TimeEntriesList from '@/components/time-tracking/TimeEntriesList';
import { Clock } from 'lucide-react';
import { LoadingInline } from '@/components/ui/loader';

export default function TimeTrackingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold">Відстеження часу</h1>
        </div>
        <p className="text-muted-foreground">
          Аналізуйте свій час та відстежуйте прогрес по цілях
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="statistics" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="statistics">Статистика</TabsTrigger>
          <TabsTrigger value="entries">Записи</TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" className="mt-6">
          <Suspense fallback={<LoadingInline message="Завантаження статистики..." />}>
            <TimeStatsCharts />
          </Suspense>
        </TabsContent>

        <TabsContent value="entries" className="mt-6">
          <Suspense fallback={<LoadingInline message="Завантаження записів..." />}>
            <TimeEntriesList />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
