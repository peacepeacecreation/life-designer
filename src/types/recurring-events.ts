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
