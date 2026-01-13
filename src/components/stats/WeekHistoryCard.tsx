'use client';

import { useMemo } from 'react';
import { Goal } from '@/types';
import { Card } from '@/components/ui/card';
import { calculateGoalTimeProgress, getWeekLabel } from '@/utils/goalTimeProgress';
import { useRecurringEvents } from '@/contexts/RecurringEventsContext';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { useTimeCalculator } from '@/contexts/TimeCalculatorContext';
import { Clock, CheckCircle, Calendar, Coffee } from 'lucide-react';
import { GoalWeekProgressList } from './GoalWeekProgressList';

interface WeekHistoryCardProps {
  weekOffset: number;
  goals: Goal[];
}

export function WeekHistoryCard({ weekOffset, goals }: WeekHistoryCardProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();
  const { timeAllocation } = useTimeCalculator();

  // Розраховуємо загальну статистику за тиждень
  const weekStats = useMemo(() => {
    let totalCompleted = 0;
    let totalScheduled = 0;
    let totalAllocated = 0;

    goals.forEach((goal) => {
      const progress = calculateGoalTimeProgress(
        goal.id,
        goal.timeAllocated,
        recurringEvents,
        calendarEvents,
        weekOffset
      );

      totalCompleted += progress.completed;
      totalScheduled += progress.scheduled;
      totalAllocated += progress.totalAllocated;
    });

    // Вільний час = доступний час - виділений час на цілі
    const freeTime = Math.max(0, timeAllocation.totalAvailableHours - totalAllocated);

    return {
      totalCompleted: Math.round(totalCompleted * 10) / 10,
      totalScheduled: Math.round(totalScheduled * 10) / 10,
      totalAllocated: Math.round(totalAllocated * 10) / 10,
      freeTime: Math.round(freeTime * 10) / 10,
      totalAvailable: Math.round(timeAllocation.totalAvailableHours * 10) / 10,
    };
  }, [goals, recurringEvents, calendarEvents, weekOffset, timeAllocation]);

  const weekLabel = getWeekLabel(weekOffset);

  return (
    <div className="space-y-6">
      {/* Заголовок тижня */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black dark:text-white">{weekLabel}</h2>
      </div>

      {/* KPI Картки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-sm text-muted-foreground">Виділено на цілі</h3>
          </div>
          <p className="text-3xl font-bold text-black dark:text-white">
            {weekStats.totalAllocated} год
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            З {weekStats.totalAvailable} доступних годин
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm text-muted-foreground">Зроблено</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {weekStats.totalCompleted} год
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            {weekStats.totalAllocated > 0
              ? `${((weekStats.totalCompleted / weekStats.totalAllocated) * 100).toFixed(1)}%`
              : '0%'}{' '}
            від виділених
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm text-muted-foreground">Заплановано</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {weekStats.totalScheduled} год
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            {weekStats.totalAllocated > 0
              ? `${((weekStats.totalScheduled / weekStats.totalAllocated) * 100).toFixed(1)}%`
              : '0%'}{' '}
            від виділених
          </p>
        </Card>

        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm text-muted-foreground">Вільний час</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {weekStats.freeTime} год
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            Час поза цілями
          </p>
        </Card>
      </div>

      {/* Список цілей з прогресом */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
          Прогрес цілей за цей тиждень
        </h3>
        <GoalWeekProgressList goals={goals} weekOffset={weekOffset} />
      </div>
    </div>
  );
}
