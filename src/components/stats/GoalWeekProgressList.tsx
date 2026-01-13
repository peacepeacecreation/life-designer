'use client';

import { useMemo } from 'react';
import { Goal } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statusLabels, getCategoryMeta } from '@/lib/categoryConfig';
import { calculateGoalTimeProgress } from '@/utils/goalTimeProgress';
import { useRecurringEvents } from '@/contexts/RecurringEventsContext';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { Clock } from 'lucide-react';

interface GoalWeekProgressListProps {
  goals: Goal[];
  weekOffset: number;
}

export function GoalWeekProgressList({ goals, weekOffset }: GoalWeekProgressListProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();

  // Сортуємо цілі по назві
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => a.name.localeCompare(b.name));
  }, [goals]);

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Немає цілей для відображення
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedGoals.map((goal) => {
        const categoryMeta = getCategoryMeta(goal.category);
        const progress = calculateGoalTimeProgress(
          goal.id,
          goal.timeAllocated,
          recurringEvents,
          calendarEvents,
          weekOffset
        );

        return (
          <Card key={goal.id} className="p-6 bg-white dark:bg-card hover:shadow-md transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-black dark:text-white mb-1">
                    {goal.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{categoryMeta.name}</p>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {statusLabels[goal.status]}
                </Badge>
              </div>

              {/* Progress Bar */}
              {goal.timeAllocated > 0 && (
                <div className="space-y-2">
                  <div className="relative h-3 w-full rounded-full overflow-hidden bg-[var(--background)]">
                    {/* Completed segment - solid */}
                    <div
                      className="absolute left-0 top-0 h-full bg-black dark:bg-white transition-all"
                      style={{ width: `${progress.completedPercent}%` }}
                    />

                    {/* Scheduled segment - striped */}
                    <div
                      className="absolute top-0 h-full bg-striped-black dark:bg-striped-white transition-all"
                      style={{
                        left: `${progress.completedPercent}%`,
                        width: `${progress.scheduledPercent}%`,
                      }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Виділено:</span>
                      <span className="ml-2 font-semibold text-black dark:text-white">
                        {progress.totalAllocated} год
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Зроблено:</span>
                      <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                        {progress.completed} год
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Заплановано:</span>
                      <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                        {progress.scheduled} год
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Треба запланувати:</span>
                      <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400">
                        {progress.unscheduled} год
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Time allocation (if no progress bar) */}
              {goal.timeAllocated === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Час не виділено</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
