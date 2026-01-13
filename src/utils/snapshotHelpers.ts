/**
 * Snapshot Helper Functions
 *
 * Utilities for creating and managing weekly snapshots
 */

import { createHash } from 'crypto';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Goal } from '@/types';
import { RecurringEvent } from '@/types/recurring-events';
import { CalendarEventWithGoal } from '@/types/calendar-events';
import { calculateGoalTimeProgress } from './goalTimeProgress';
import {
  WeeklySnapshot,
  WeeklyGoalSnapshot,
  WeeklyRecurringEventSnapshot,
} from '@/types/weekly-snapshots';

/**
 * Calculate weekly statistics for all goals
 */
export function calculateWeeklyStats(
  goals: Goal[],
  recurringEvents: RecurringEvent[],
  calendarEvents: CalendarEventWithGoal[],
  weekOffset: number,
  totalAvailableHours: number
): {
  totalAllocatedHours: number;
  totalCompletedHours: number;
  totalScheduledHours: number;
  freeTimeHours: number;
} {
  let totalAllocated = 0;
  let totalCompleted = 0;
  let totalScheduled = 0;

  goals.forEach((goal) => {
    const progress = calculateGoalTimeProgress(
      goal.id,
      goal.timeAllocated,
      recurringEvents,
      calendarEvents,
      weekOffset
    );

    totalAllocated += progress.totalAllocated;
    totalCompleted += progress.completed;
    totalScheduled += progress.scheduled;
  });

  const freeTime = Math.max(0, totalAvailableHours - totalAllocated);

  // Ensure no NaN values
  return {
    totalAllocatedHours: Number.isFinite(totalAllocated) ? Math.round(totalAllocated * 100) / 100 : 0,
    totalCompletedHours: Number.isFinite(totalCompleted) ? Math.round(totalCompleted * 100) / 100 : 0,
    totalScheduledHours: Number.isFinite(totalScheduled) ? Math.round(totalScheduled * 100) / 100 : 0,
    freeTimeHours: Number.isFinite(freeTime) ? Math.round(freeTime * 100) / 100 : totalAvailableHours,
  };
}

/**
 * Create goal snapshot from current goal state
 */
export function createGoalSnapshot(
  goal: Goal,
  recurringEvents: RecurringEvent[],
  calendarEvents: CalendarEventWithGoal[],
  weekOffset: number
): Omit<WeeklyGoalSnapshot, 'id' | 'snapshotId' | 'createdAt'> {
  const progress = calculateGoalTimeProgress(
    goal.id,
    goal.timeAllocated,
    recurringEvents,
    calendarEvents,
    weekOffset
  );

  return {
    goalId: goal.id,
    goalName: goal.name,
    goalDescription: goal.description,
    goalCategory: goal.category,
    goalPriority: goal.priority,
    goalStatus: goal.status,
    goalColor: goal.color || undefined,
    goalIconUrl: goal.iconUrl || undefined,
    goalUrl: goal.url || undefined,

    timeAllocated: goal.timeAllocated,

    currency: goal.currency || undefined,
    paymentType: goal.paymentType || undefined,
    hourlyRate: goal.hourlyRate || undefined,
    fixedRate: goal.fixedRate || undefined,
    fixedRatePeriod: goal.fixedRatePeriod || undefined,

    isOngoing: goal.isOngoing ?? false,
    startDate: goal.startDate ? goal.startDate.toISOString() : undefined,
    targetEndDate: goal.targetEndDate ? goal.targetEndDate.toISOString() : undefined,

    timeCompleted: progress.completed,
    timeScheduled: progress.scheduled,
    timeUnscheduled: progress.unscheduled,
  };
}

/**
 * Create recurring event snapshot from current recurring event state
 */
export function createRecurringEventSnapshot(
  recurringEvent: RecurringEvent,
  goalSnapshotId?: string
): Omit<WeeklyRecurringEventSnapshot, 'id' | 'snapshotId' | 'createdAt'> {
  return {
    recurringEventId: recurringEvent.id,
    goalSnapshotId: goalSnapshotId || null,

    title: recurringEvent.title,
    description: recurringEvent.description || undefined,
    startTime: recurringEvent.startTime,
    duration: recurringEvent.duration,
    frequency: recurringEvent.recurrence.frequency,
    interval: recurringEvent.recurrence.interval,
    daysOfWeek: recurringEvent.recurrence.daysOfWeek || undefined,
    color: recurringEvent.color || undefined,

    isActive: recurringEvent.isActive,
  };
}

/**
 * Generate hash for snapshot data to detect changes
 */
export function generateSnapshotHash(
  goals: Goal[],
  recurringEvents: RecurringEvent[]
): string {
  // Sort by ID for consistent hashing
  const sortedGoals = [...goals].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEvents = [...recurringEvents].sort((a, b) => a.id.localeCompare(b.id));

  // Include relevant fields that affect historical data
  const goalsData = sortedGoals.map((g) => ({
    id: g.id,
    timeAllocated: g.timeAllocated,
    status: g.status,
    category: g.category,
  }));

  const eventsData = sortedEvents.map((e) => ({
    id: e.id,
    goalId: e.goalId,
    startTime: e.startTime,
    duration: e.duration,
    frequency: e.recurrence.frequency,
    daysOfWeek: e.recurrence.daysOfWeek,
    isActive: e.isActive,
  }));

  const dataString = JSON.stringify({ goals: goalsData, events: eventsData });
  return createHash('sha256').update(dataString).digest('hex');
}

/**
 * Get week boundaries for a given offset
 */
export function getWeekBoundaries(weekOffset: number): {
  weekStart: Date;
  weekEnd: Date;
} {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + weekOffset * 7);

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  return { weekStart, weekEnd };
}
