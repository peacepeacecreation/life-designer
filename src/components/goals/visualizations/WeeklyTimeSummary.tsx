"use client";

import { useMemo } from "react";
import { Goal } from "@/types";
import { useRecurringEvents } from "@/contexts/RecurringEventsContext";
import { useCalendarEventsContext } from "@/contexts/CalendarEventsContext";
import { calculateGoalTimeProgress } from "@/utils/goalTimeProgress";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, Calendar, AlertCircle } from "lucide-react";

interface WeeklyTimeSummaryProps {
  goals: Goal[];
}

export default function WeeklyTimeSummary({ goals }: WeeklyTimeSummaryProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();

  const summary = useMemo(() => {
    let totalAllocated = 0;
    let totalCompleted = 0;
    let totalScheduled = 0;
    let totalUnscheduled = 0;

    goals.forEach(goal => {
      const progress = calculateGoalTimeProgress(
        goal.id,
        goal.timeAllocated,
        recurringEvents,
        calendarEvents
      );

      totalAllocated += progress.totalAllocated;
      totalCompleted += progress.completed;
      totalScheduled += progress.scheduled;
      totalUnscheduled += progress.unscheduled;
    });

    const totalSpent = totalCompleted + totalScheduled;
    const completionRate = totalAllocated > 0
      ? Math.round((totalCompleted / totalAllocated) * 100)
      : 0;

    return {
      totalAllocated: Math.round(totalAllocated * 10) / 10,
      totalCompleted: Math.round(totalCompleted * 10) / 10,
      totalScheduled: Math.round(totalScheduled * 10) / 10,
      totalUnscheduled: Math.round(totalUnscheduled * 10) / 10,
      totalSpent: Math.round(totalSpent * 10) / 10,
      completionRate,
    };
  }, [goals, recurringEvents, calendarEvents]);

  const getStatusColor = () => {
    if (summary.completionRate >= 80) return "text-green-600 dark:text-green-400";
    if (summary.completionRate >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusMessage = () => {
    if (summary.completionRate >= 80) return "Чудовий прогрес!";
    if (summary.completionRate >= 50) return "Добре йде";
    if (summary.completionRate > 0) return "Потрібно підтягнути";
    return "Почніть працювати";
  };

  return (
    <Card className="bg-white dark:bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Тижневий калькулятор
          </h2>
          <div className={`flex items-center gap-2 text-sm font-semibold ${getStatusColor()}`}>
            <CheckCircle2 className="h-5 w-5" />
            <span>{summary.completionRate}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {getStatusMessage()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Заплановано */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold text-black dark:text-white">
              {summary.totalAllocated}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Заплановано</p>
          </div>

          {/* Виконано */}
          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <p className="text-2xl font-bold text-black dark:text-white">
              {summary.totalCompleted}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Виконано</p>
          </div>

          {/* Заброньовано */}
          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold text-black dark:text-white">
              {summary.totalScheduled}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Заброньовано</p>
          </div>

          {/* Не заплановано */}
          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
            <p className="text-2xl font-bold text-black dark:text-white">
              {summary.totalUnscheduled}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Не заплановано</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Прогрес тижня</span>
            <span className="font-semibold text-black dark:text-white">
              {summary.totalCompleted} / {summary.totalAllocated} год
            </span>
          </div>
          <div className="relative h-3 w-full rounded-full overflow-hidden bg-muted">
            {/* Completed - solid */}
            <div
              className="absolute left-0 top-0 h-full bg-green-600 dark:bg-green-400 transition-all"
              style={{
                width: `${summary.totalAllocated > 0
                  ? (summary.totalCompleted / summary.totalAllocated) * 100
                  : 0}%`
              }}
            />
            {/* Scheduled - striped */}
            <div
              className="absolute top-0 h-full transition-all"
              style={{
                left: `${summary.totalAllocated > 0
                  ? (summary.totalCompleted / summary.totalAllocated) * 100
                  : 0}%`,
                width: `${summary.totalAllocated > 0
                  ? (summary.totalScheduled / summary.totalAllocated) * 100
                  : 0}%`,
                background: 'repeating-linear-gradient(45deg, rgb(59 130 246), rgb(59 130 246) 10px, rgb(147 197 253) 10px, rgb(147 197 253) 20px)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
                <span>Виконано</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm"
                  style={{
                    background: 'repeating-linear-gradient(45deg, rgb(59 130 246), rgb(59 130 246) 4px, rgb(147 197 253) 4px, rgb(147 197 253) 8px)',
                  }}
                />
                <span>Заброньовано</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <span>Не заплановано</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        {summary.totalUnscheduled > 0 && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-black dark:text-white">
                  Залишилось {summary.totalUnscheduled} год не заброньовано
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Додайте події в календар або створіть повторювані події для ваших цілей
                </p>
              </div>
            </div>
          </div>
        )}

        {summary.completionRate >= 100 && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-black dark:text-white">
                  Вітаємо! Тижневий план виконано! 🎉
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Ви виконали всі заплановані години на цей тиждень
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
