import { RecurringEvent } from '@/types/recurring-events';
import { CalendarEventWithGoal } from '@/types/calendar-events';
import { generateEventsFromRecurring } from './recurringEvents';
import { startOfWeek, endOfWeek, isBefore, isWithinInterval, format } from 'date-fns';
import { uk } from 'date-fns/locale';

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
 * Розраховує прогрес виконання цілі на вказаний тиждень
 *
 * @param goalId - ID цілі
 * @param goalTimeAllocated - Виділено годин на тиждень для цілі
 * @param recurringEvents - Всі повторювані події
 * @param calendarEvents - Всі одноразові події з календаря
 * @param weekOffset - Зміщення тижня від поточного (0 = поточний, -1 = минулий, -2 = два тижні тому, і т.д.)
 * @returns Детальна інформація про прогрес
 */
export function calculateGoalTimeProgress(
  goalId: string,
  goalTimeAllocated: number,
  recurringEvents: RecurringEvent[],
  calendarEvents: CalendarEventWithGoal[] = [],
  weekOffset: number = 0
): GoalTimeProgress {
  const now = new Date();

  // Обчислюємо початок і кінець потрібного тижня
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Понеділок
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // Неділя

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

      // Для минулих тижнів всі події вважаються виконаними
      if (weekOffset < 0) {
        completedMinutes += durationMinutes;
      } else {
        // Для поточного або майбутніх тижнів перевіряємо чи подія пройшла
        if (isBefore(event.end, now)) {
          completedMinutes += durationMinutes;
        } else {
          // Інакше - заплановано на майбутнє
          scheduledMinutes += durationMinutes;
        }
      }
    });
  });

  // Додаємо одноразові події з календаря, які пов'язані з цією ціллю
  const goalCalendarEvents = calendarEvents.filter(
    event => event.goalId === goalId
  );

  goalCalendarEvents.forEach(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Перевіряємо чи подія в межах поточного тижня
    const isInWeek = isWithinInterval(eventStart, { start: weekStart, end: weekEnd }) ||
                     isWithinInterval(eventEnd, { start: weekStart, end: weekEnd });

    if (isInWeek) {
      const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);

      // Для минулих тижнів всі події вважаються виконаними
      if (weekOffset < 0) {
        completedMinutes += durationMinutes;
      } else {
        // Для поточного або майбутніх тижнів перевіряємо чи подія пройшла
        if (isBefore(eventEnd, now)) {
          completedMinutes += durationMinutes;
        } else {
          // Інакше - заплановано на майбутнє
          scheduledMinutes += durationMinutes;
        }
      }
    }
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

/**
 * Повертає мітку для тижня (наприклад "Поточний тиждень", "Минулий тиждень", "16 грудня - 22 грудня")
 *
 * @param weekOffset - Зміщення тижня від поточного (0 = поточний, -1 = минулий, і т.д.)
 * @returns Мітка для відображення
 */
export function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) {
    return 'Поточний тиждень';
  }
  if (weekOffset === -1) {
    return 'Минулий тиждень';
  }

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  return `${format(weekStart, 'd MMM', { locale: uk })} - ${format(weekEnd, 'd MMM yyyy', { locale: uk })}`;
}

/**
 * Повертає діапазон дат для тижня
 *
 * @param weekOffset - Зміщення тижня від поточного
 * @returns Об'єкт з початком і кінцем тижня
 */
export function getWeekRange(weekOffset: number): { start: Date; end: Date } {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

  return {
    start: startOfWeek(targetDate, { weekStartsOn: 1 }),
    end: endOfWeek(targetDate, { weekStartsOn: 1 }),
  };
}
