"use client";

import { useMemo } from "react";
import { Goal } from "@/types";
import { useRecurringEvents } from "@/contexts/RecurringEventsContext";
import { useCalendarEventsContext } from "@/contexts/CalendarEventsContext";
import { calculateGoalTimeProgress } from "@/utils/goalTimeProgress";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface WeeklyTimeSummaryProps {
  goals: Goal[];
}

export default function WeeklyTimeSummary({ goals }: WeeklyTimeSummaryProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();

  const summary = useMemo(() => {
    const now = new Date();
    let totalAllocated = 0;
    let totalCompleted = 0;
    let totalScheduled = 0;
    let totalUnscheduled = 0;
    let otherPlansCompleted = 0;
    let otherPlansScheduled = 0;

    // Calculate for goals
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

    // Calculate events without goals (other plans)
    const goalIds = goals.map(g => g.id);

    // Recurring events without goals
    recurringEvents
      .filter(event => event.isActive && !event.goalId)
      .forEach(recurringEvent => {
        // Simple estimation: count as appearing daily for this week
        const instancesPerWeek = recurringEvent.recurrence.frequency === 'daily' ? 7 :
                                  recurringEvent.recurrence.daysOfWeek?.length || 1;
        const durationHours = recurringEvent.duration / 60;
        const weekTotal = durationHours * instancesPerWeek;

        // Roughly split between completed and scheduled
        const completedRatio = 0.5; // Assume half the week has passed
        otherPlansCompleted += weekTotal * completedRatio;
        otherPlansScheduled += weekTotal * (1 - completedRatio);
      });

    // Calendar events without goals
    calendarEvents
      .filter(event => !event.goalId)
      .forEach(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);

        if (eventEnd < now) {
          otherPlansCompleted += durationHours;
        } else {
          otherPlansScheduled += durationHours;
        }
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
      otherPlansCompleted: Math.round(otherPlansCompleted * 10) / 10,
      otherPlansScheduled: Math.round(otherPlansScheduled * 10) / 10,
      totalSpent: Math.round(totalSpent * 10) / 10,
      completionRate,
    };
  }, [goals, recurringEvents, calendarEvents]);

  return (
    <Card className="bg-white dark:bg-card">
      <CardHeader>
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Тижневий калькулятор
        </h2>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Фактично виконано / Заплановано</span>
            <span className="font-semibold text-black dark:text-white">
              {summary.totalCompleted} / {summary.totalAllocated} год
            </span>
          </div>
          <div className="relative h-3 w-full rounded-full overflow-hidden bg-muted">
            {/* Completed on goals - solid green */}
            <div
              className="absolute left-0 top-0 h-full bg-green-600 dark:bg-green-400 transition-all"
              style={{
                width: `${summary.totalAllocated > 0
                  ? (summary.totalCompleted / summary.totalAllocated) * 100
                  : 0}%`
              }}
            />
            {/* Scheduled on goals - striped blue */}
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
            {/* Other plans - solid red (on top, absolute positioning) */}
            {(summary.otherPlansCompleted > 0 || summary.otherPlansScheduled > 0) && (
              <div
                className="absolute left-0 top-0 h-full bg-red-600 dark:bg-red-400 transition-all opacity-80"
                style={{
                  width: `${summary.totalAllocated > 0
                    ? ((summary.otherPlansCompleted + summary.otherPlansScheduled) / summary.totalAllocated) * 100
                    : 0}%`
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
                <span>Виконано на цілі</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm"
                  style={{
                    background: 'repeating-linear-gradient(45deg, rgb(59 130 246), rgb(59 130 246) 4px, rgb(147 197 253) 4px, rgb(147 197 253) 8px)',
                  }}
                />
                <span>Заброньовано на цілі</span>
              </div>
              {(summary.otherPlansCompleted > 0 || summary.otherPlansScheduled > 0) && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-600 dark:bg-red-400" />
                  <span>Інші плани ({Math.round((summary.otherPlansCompleted + summary.otherPlansScheduled) * 10) / 10} год)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <span>Не заплановано</span>
              </div>
            </div>
          </div>

          {/* Other Plans Info */}
          {(summary.otherPlansCompleted > 0 || summary.otherPlansScheduled > 0) && (
            <div className="pt-3 mt-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                <span>Інші плани (не пов'язані з цілями): </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {Math.round((summary.otherPlansCompleted + summary.otherPlansScheduled) * 10) / 10} год
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
