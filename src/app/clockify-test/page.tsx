'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { LoadingInline } from '@/components/ui/loader';
import ClockifyWeeklyTable from '@/components/clockify/ClockifyWeeklyTable';
import { Button } from '@/components/ui/button';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';

export default function ClockifyPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [syncing, setSyncing] = useState(false);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Image
                src="/clockify.svg"
                alt="Clockify"
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Clockify</h1>
              <p className="text-muted-foreground text-sm">
                Перегляд та аналіз часу з Clockify
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Попередній</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
            >
              Поточний
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              <span className="hidden sm:inline mr-1">Наступний</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-0.5" />

            <Button
              variant="default"
              size="sm"
              onClick={() => setSyncing(true)}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''} sm:mr-2`} />
              <span className="hidden sm:inline">{syncing ? 'Синхронізація...' : 'Оновити'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Table */}
      <ClockifyWeeklyTable
        currentWeekStart={currentWeekStart}
        syncing={syncing}
        setSyncing={setSyncing}
      />
    </div>
  );
}
