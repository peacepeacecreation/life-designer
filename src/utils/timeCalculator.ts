import { RecurringEvent } from '@/types/recurring-events';
import { generateEventsFromRecurring } from './recurringEvents';
import { WorkHours } from '@/types/global-settings';
import { Goal } from '@/types/goals';
import { startOfWeek, endOfWeek, eachDayOfInterval, getDay, getHours } from 'date-fns';

interface CalendarEvent {
  start: Date;
  end: Date;
  goalId?: string;
}

interface TimeAllocation {
  totalAvailableHours: number;      // Загальна кількість годин в робочому тижні
  scheduledHours: number;            // Час запланований в календарі (з goalId + без goalId)
  goalsHours: number;                // Час ще треба запланувати (timeAllocated - scheduled для кожної цілі)
  freeHours: number;                 // Вільний час
}

/**
 * Розраховує доступний час на тиждень на основі workHours
 */
export function calculateAvailableHoursPerWeek(workHours: WorkHours): number {
  const { startHour, endHour, workDays } = workHours;
  const hoursPerDay = endHour - startHour;
  const daysPerWeek = workDays.length;

  return hoursPerDay * daysPerWeek;
}

/**
 * Розраховує скільки годин зайнято календарними подіями за тиждень
 */
export function calculateEventHoursPerWeek(
  recurringEvents: RecurringEvent[],
  workHours: WorkHours
): number {
  // Беремо поточний тиждень
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Понеділок
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Генеруємо всі події за тиждень
  const allEvents: CalendarEvent[] = [];
  recurringEvents.forEach(recurringEvent => {
    const events = generateEventsFromRecurring(recurringEvent, weekStart, weekEnd);
    allEvents.push(...events);
  });

  // Рахуємо години
  let totalMinutes = 0;
  allEvents.forEach(event => {
    const duration = event.end.getTime() - event.start.getTime();
    totalMinutes += duration / (1000 * 60);
  });

  return totalMinutes / 60; // Перетворюємо в години
}

/**
 * Розраховує скільки годин зайнято календарними подіями тільки в робочі години
 */
export function calculateEventHoursInWorkHours(
  recurringEvents: RecurringEvent[],
  workHours: WorkHours
): number {
  const { startHour, endHour, workDays } = workHours;

  // Беремо поточний тиждень
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Генеруємо всі події за тиждень
  const allEvents: CalendarEvent[] = [];
  recurringEvents.forEach(recurringEvent => {
    const events = generateEventsFromRecurring(recurringEvent, weekStart, weekEnd);
    allEvents.push(...events);
  });

  // Рахуємо тільки години в робочий час
  let totalMinutes = 0;
  allEvents.forEach(event => {
    const eventDay = getDay(event.start);

    // Перевіряємо чи подія в робочий день
    if (!workDays.includes(eventDay)) {
      return;
    }

    // Обмежуємо подію робочими годинами
    const eventStartHour = getHours(event.start) + event.start.getMinutes() / 60;
    const eventEndHour = getHours(event.end) + event.end.getMinutes() / 60;

    const effectiveStart = Math.max(eventStartHour, startHour);
    const effectiveEnd = Math.min(eventEndHour, endHour);

    if (effectiveEnd > effectiveStart) {
      const durationHours = effectiveEnd - effectiveStart;
      totalMinutes += durationHours * 60;
    }
  });

  return totalMinutes / 60;
}

/**
 * Розраховує розподіл часу з урахуванням запланованих подій та цілей
 */
export function calculateTimeAllocation(
  recurringEvents: RecurringEvent[],
  workHours: WorkHours,
  goals: Goal[] = []
): TimeAllocation {
  const totalAvailableHours = calculateAvailableHoursPerWeek(workHours);

  // Беремо поточний тиждень
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Генеруємо всі події за тиждень і групуємо по goalId
  const scheduledByGoal = new Map<string | undefined, number>(); // goalId -> hours

  recurringEvents.forEach(recurringEvent => {
    const events = generateEventsFromRecurring(recurringEvent, weekStart, weekEnd);

    events.forEach(event => {
      const eventDay = getDay(event.start);

      // Перевіряємо чи подія в робочий день
      if (!workHours.workDays.includes(eventDay)) {
        return;
      }

      // Обмежуємо подію робочими годинами
      const eventStartHour = getHours(event.start) + event.start.getMinutes() / 60;
      const eventEndHour = getHours(event.end) + event.end.getMinutes() / 60;

      const effectiveStart = Math.max(eventStartHour, workHours.startHour);
      const effectiveEnd = Math.min(eventEndHour, workHours.endHour);

      if (effectiveEnd > effectiveStart) {
        const durationHours = effectiveEnd - effectiveStart;
        const goalId = recurringEvent.goalId;
        scheduledByGoal.set(goalId, (scheduledByGoal.get(goalId) || 0) + durationHours);
      }
    });
  });

  // Рахуємо загальні заплановані години
  let totalScheduled = 0;
  scheduledByGoal.forEach(hours => {
    totalScheduled += hours;
  });

  // Рахуємо незаплановані години для цілей
  let unscheduledGoalsHours = 0;
  goals.forEach(goal => {
    const scheduledForGoal = scheduledByGoal.get(goal.id) || 0;
    const remaining = Math.max(0, goal.timeAllocated - scheduledForGoal);
    unscheduledGoalsHours += remaining;
  });

  const freeHours = Math.max(0, totalAvailableHours - totalScheduled - unscheduledGoalsHours);

  return {
    totalAvailableHours,
    scheduledHours: Math.round(totalScheduled * 10) / 10,
    goalsHours: Math.round(unscheduledGoalsHours * 10) / 10,
    freeHours: Math.round(freeHours * 10) / 10,
  };
}
