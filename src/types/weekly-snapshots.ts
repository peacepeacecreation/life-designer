/**
 * Weekly Snapshots Types
 *
 * Immutable snapshots of goals and recurring events settings for historical tracking.
 * Used to preserve accurate historical data even when goals/events are modified or deleted.
 */

import { GoalCategory, GoalStatus, GoalPriority } from './index';

/**
 * Main weekly snapshot containing overall statistics
 */
export interface WeeklySnapshot {
  id: string;
  userId: string;

  // Week boundaries (Monday 00:00 to Sunday 23:59)
  weekStartDate: string; // ISO timestamp
  weekEndDate: string;   // ISO timestamp

  // Overall statistics
  totalAvailableHours: number;
  totalAllocatedHours: number;
  totalCompletedHours: number;
  totalScheduledHours: number;
  freeTimeHours: number;

  // Metadata
  isFrozen: boolean; // Manually frozen/saved by user
  snapshotHash?: string; // Hash for change detection

  createdAt: string;
  updatedAt: string;

  // Relations (populated when needed)
  goalSnapshots?: WeeklyGoalSnapshot[];
  recurringEventSnapshots?: WeeklyRecurringEventSnapshot[];
}

/**
 * Goal settings snapshot - preserves goal configuration at snapshot time
 */
export interface WeeklyGoalSnapshot {
  id: string;
  snapshotId: string;

  // Goal reference (may be null if goal deleted)
  goalId: string | null;

  // Goal settings at snapshot time
  goalName: string;
  goalDescription?: string;
  goalCategory: GoalCategory;
  goalPriority: GoalPriority;
  goalStatus: GoalStatus;
  goalColor?: string;
  goalIconUrl?: string;
  goalUrl?: string;

  // Time allocation (critical for historical tracking)
  timeAllocated: number; // Hours per week

  // Financial settings
  currency?: string;
  paymentType?: 'hourly' | 'fixed';
  hourlyRate?: number;
  fixedRate?: number;
  fixedRatePeriod?: 'week' | 'month';

  // Goal timeline
  isOngoing: boolean;
  startDate?: string;
  targetEndDate?: string;

  // Statistics (calculated from events)
  timeCompleted: number;
  timeScheduled: number;
  timeUnscheduled: number;

  createdAt: string;
}

/**
 * Recurring event settings snapshot - preserves event configuration at snapshot time
 */
export interface WeeklyRecurringEventSnapshot {
  id: string;
  snapshotId: string;

  // Recurring event reference (may be null if deleted)
  recurringEventId: string | null;

  // Link to goal snapshot (not direct goal_id)
  goalSnapshotId?: string | null;

  // Event settings at snapshot time
  title: string;
  description?: string;
  startTime: string; // Format: "HH:MM"
  duration: number;  // Minutes
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;  // Every N days/weeks/months
  daysOfWeek?: number[]; // For weekly: [1,2,3,4,5] for weekdays
  color?: string;

  // Status at snapshot time
  isActive: boolean;

  createdAt: string;
}

/**
 * Request to create a new weekly snapshot
 */
export interface CreateWeeklySnapshotRequest {
  weekStartDate: string;
  weekEndDate: string;
  isFrozen?: boolean; // Optional - default false
}

/**
 * Response when creating or fetching a snapshot
 */
export interface WeeklySnapshotResponse {
  snapshot: WeeklySnapshot;
  goalSnapshots: WeeklyGoalSnapshot[];
  recurringEventSnapshots: WeeklyRecurringEventSnapshot[];
}

/**
 * Helper type for snapshot change detection
 */
export interface SnapshotChangeStatus {
  hasSnapshot: boolean;
  hasChanges: boolean;
  lastUpdated?: string;
  canRecalculate: boolean;
}
