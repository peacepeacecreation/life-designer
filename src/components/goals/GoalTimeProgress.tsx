"use client";

import { useMemo } from "react";
import { Goal } from "@/types";
import { useRecurringEvents } from "@/contexts/RecurringEventsContext";
import { calculateGoalTimeProgress } from "@/utils/goalTimeProgress";
import { Clock } from "lucide-react";

interface GoalTimeProgressProps {
  goal: Goal;
}

export default function GoalTimeProgress({ goal }: GoalTimeProgressProps) {
  const { recurringEvents } = useRecurringEvents();

  const progress = useMemo(() => {
    return calculateGoalTimeProgress(
      goal.id,
      goal.timeAllocated,
      recurringEvents,
    );
  }, [goal.id, goal.timeAllocated, recurringEvents]);

  if (goal.timeAllocated === 0) {
    return null;
  }

  const hasScheduled = progress.completed + progress.scheduled > 0;

  return (
    <div className="space-y-1.5">
      {/* Compact Progress Bar */}
      <div className="relative h-2 w-full rounded-full overflow-hidden mb-3 bg-[var(--background)] overflow-hidden ">
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

      {/* Header with time allocation */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Час на тиждень:</span>
        </div>
        <span className="font-semibold text-black dark:text-white">
          {goal.timeAllocated} год
        </span>
      </div>
    </div>
  );
}
