import { RecurringEvent } from '@/types/recurring-events';
import { generateEventsFromRecurring } from './recurringEvents';
import { startOfWeek, endOfWeek, isBefore } from 'date-fns';

export interface GoalTimeProgress {
  totalAllocated: number;    // Загальна кількість годин виділених на ціль
  completed: number;          // Години вже виконані (минулі події)
  scheduled: number;          // Години заплановані (майбутні події)
  unscheduled: number;        // Години не заплановані
  completedPercent: number;   // % виконаних від загальних
  scheduledPercent: number;   // % запланованих від загальних
  unscheduledPercent: number; // % незапланованих від загальних
}

/**
 * Розраховує прогрес виконання цілі на поточний тиждень
 *
 * @param goalId - ID цілі
 * @param goalTimeAllocated - Виділено годин на тиждень для цілі
 * @param recurringEvents - Всі повторювані події
 * @returns Детальна інформація про прогрес
 */
export function calculateGoalTimeProgress(
  goalId: string,
  goalTimeAllocated: number,
  recurringEvents: RecurringEvent[]
): GoalTimeProgress {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Понеділок
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Неділя

  // Фільтруємо тільки активні події пов'язані з цією ціллю
  const goalEvents = recurringEvents.filter(
    event => event.isActive && event.goalId === goalId
  );

  let completedMinutes = 0;
  let scheduledMinutes = 0;

  // Генеруємо всі події за тиждень і розділяємо на минулі та майбутні
  goalEvents.forEach(recurringEvent => {
    const events = generateEventsFromRecurring(recurringEvent, weekStart, weekEnd);

    events.forEach(event => {
      const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);

      // Якщо подія вже пройшла (end < now), вважаємо виконаною
      if (isBefore(event.end, now)) {
        completedMinutes += durationMinutes;
      } else {
        // Інакше - заплановано на майбутнє
        scheduledMinutes += durationMinutes;
      }
    });
  });

  const completed = completedMinutes / 60;
  const scheduled = scheduledMinutes / 60;
  const totalScheduled = completed + scheduled;
  const unscheduled = Math.max(0, goalTimeAllocated - totalScheduled);

  return {
    totalAllocated: goalTimeAllocated,
    completed: Math.round(completed * 10) / 10,
    scheduled: Math.round(scheduled * 10) / 10,
    unscheduled: Math.round(unscheduled * 10) / 10,
    completedPercent: goalTimeAllocated > 0 ? (completed / goalTimeAllocated) * 100 : 0,
    scheduledPercent: goalTimeAllocated > 0 ? (scheduled / goalTimeAllocated) * 100 : 0,
    unscheduledPercent: goalTimeAllocated > 0 ? (unscheduled / goalTimeAllocated) * 100 : 0,
  };
}
