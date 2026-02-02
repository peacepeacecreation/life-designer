"use client";

import { useMemo } from "react";
import { Goal } from "@/types";
import { useRecurringEvents } from "@/contexts/RecurringEventsContext";
import { useCalendarEventsContext } from "@/contexts/CalendarEventsContext";
import { calculateGoalTimeProgress } from "@/utils/goalTimeProgress";
import { Clock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface GoalTimeProgressProps {
  goal: Goal;
}

export default function GoalTimeProgress({ goal }: GoalTimeProgressProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();

  const progress = useMemo(() => {
    return calculateGoalTimeProgress(
      goal.id,
      goal.timeAllocated,
      recurringEvents,
      calendarEvents
    );
  }, [goal.id, goal.timeAllocated, recurringEvents, calendarEvents]);

  if (goal.timeAllocated === 0) {
    return null;
  }

  const hasScheduled = progress.completed + progress.scheduled > 0;

  return (
    <div className="space-y-1.5">
      {/* Compact Progress Bar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative h-2 w-full rounded-full overflow-hidden mb-3 bg-[var(--background)] overflow-hidden cursor-help">
            {/* Completed segment - solid black */}
            <div
              className="absolute left-0 top-0 h-full bg-black dark:bg-white transition-all border"
              style={{ width: `${progress.completedPercent}%` }}
            />

            {/* Scheduled segment - striped black */}
            <div
              className="absolute top-0 h-full bg-striped-black dark:bg-striped-white transition-all bg-white rounded-xl "
              style={{
                left: `${progress.completedPercent}%`,
                width: `${progress.scheduledPercent}%`,
              }}
            />

            {/* Unscheduled is just the empty space (bg-muted) */}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <div className="font-semibold border-b border-background/20 pb-1 mb-1.5">
              Деталі часу на тиждень:
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-background/80">Зроблено:</span>
              <span className="font-semibold">{progress.completed} год</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-background/80">Заплановано:</span>
              <span className="font-semibold">{progress.scheduled} год</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-background/80">Треба запланувати:</span>
              <span className="font-semibold">{progress.unscheduled} год</span>
            </div>
            <div className="flex justify-between gap-4 pt-1.5 mt-1.5 border-t border-background/20">
              <span className="text-background/80">Всього виділено:</span>
              <span className="font-semibold">{progress.totalAllocated} год</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Header with time allocation */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Час на тиждень:</span>
        </div>
        <span className="font-semibold text-black dark:text-white">
          {progress.completed > 0
            ? `${progress.completed}/${goal.timeAllocated} год`
            : `${goal.timeAllocated} год`}
        </span>
      </div>
    </div>
  );
}
