export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 0,
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // кожен N день/тиждень/місяць
  daysOfWeek?: DayOfWeek[]; // для WEEKLY - які дні тижня
  endDate?: Date; // коли закінчується повторення
  count?: number; // або скільки разів повторити
}

export interface RecurringEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // формат "HH:MM" (наприклад "13:00")
  duration: number; // в хвилинах
  recurrence: RecurrenceRule;
  color?: string;
  goalId?: string; // зв'язок з ціллю
  category?: string; // зв'язок з категорією цілей (deprecated, використовуйте goalId)
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Приклади використання:
export const WEEKDAYS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

export const WEEKEND = [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

export const ALL_DAYS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

// Database types (snake_case from DB)
export interface RecurringEventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  duration: number;
  frequency: RecurrenceFrequency;
  interval: number;
  days_of_week: number[] | null;
  end_date: string | null;
  recurrence_count: number | null;
  color: string | null;
  goal_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper: Convert DB row (snake_case) to app format (camelCase)
export function parseRecurringEventFromDb(row: RecurringEventRow): RecurringEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    startTime: row.start_time,
    duration: row.duration,
    recurrence: {
      frequency: row.frequency,
      interval: row.interval,
      daysOfWeek: row.days_of_week ? (row.days_of_week as DayOfWeek[]) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      count: row.recurrence_count || undefined,
    },
    color: row.color || undefined,
    goalId: row.goal_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isActive: row.is_active,
  };
}

// Helper: Convert app format (camelCase) to DB payload (snake_case)
export function convertRecurringEventToDbPayload(
  event: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>
): Omit<RecurringEventRow, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    title: event.title,
    description: event.description || null,
    start_time: event.startTime,
    duration: event.duration,
    frequency: event.recurrence.frequency,
    interval: event.recurrence.interval,
    days_of_week: event.recurrence.daysOfWeek || null,
    end_date: event.recurrence.endDate ? event.recurrence.endDate.toISOString() : null,
    recurrence_count: event.recurrence.count || null,
    color: event.color || null,
    goal_id: event.goalId || null,
    is_active: event.isActive,
  };
}

// Helper: Convert partial update to DB payload
export function convertPartialUpdateToDbPayload(
  updates: Partial<RecurringEvent>
): Partial<Omit<RecurringEventRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {
  const payload: any = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description || null;
  if (updates.startTime !== undefined) payload.start_time = updates.startTime;
  if (updates.duration !== undefined) payload.duration = updates.duration;
  if (updates.color !== undefined) payload.color = updates.color || null;
  if (updates.goalId !== undefined) payload.goal_id = updates.goalId || null;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  if (updates.recurrence) {
    if (updates.recurrence.frequency !== undefined) payload.frequency = updates.recurrence.frequency;
    if (updates.recurrence.interval !== undefined) payload.interval = updates.recurrence.interval;
    if (updates.recurrence.daysOfWeek !== undefined) payload.days_of_week = updates.recurrence.daysOfWeek || null;
    if (updates.recurrence.endDate !== undefined) payload.end_date = updates.recurrence.endDate ? updates.recurrence.endDate.toISOString() : null;
    if (updates.recurrence.count !== undefined) payload.recurrence_count = updates.recurrence.count || null;
  }

  return payload;
}
