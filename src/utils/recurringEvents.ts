import {
  RecurringEvent,
  RecurrenceRule,
  RecurrenceFrequency,
  DayOfWeek,
} from '@/types/recurring-events';
import { addDays, addWeeks, addMonths, isBefore, isAfter, format, setHours, setMinutes } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  isRecurring: boolean;
  recurringEventId?: string;
  color?: string;
}

/**
 * Генерує події з повторюваної події для заданого діапазону дат
 */
export function generateEventsFromRecurring(
  recurringEvent: RecurringEvent,
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  if (!recurringEvent.isActive) {
    return [];
  }

  const events: CalendarEvent[] = [];
  const { recurrence, startTime, duration } = recurringEvent;

  // Парсинг часу початку
  const [hours, minutes] = startTime.split(':').map(Number);

  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  while (
    isBefore(currentDate, endDate) &&
    (!recurrence.count || occurrenceCount < recurrence.count) &&
    (!recurrence.endDate || isBefore(currentDate, recurrence.endDate))
  ) {
    let shouldInclude = false;

    switch (recurrence.frequency) {
      case RecurrenceFrequency.DAILY:
        shouldInclude = true;
        break;

      case RecurrenceFrequency.WEEKLY:
        if (recurrence.daysOfWeek) {
          const dayOfWeek = currentDate.getDay();
          shouldInclude = recurrence.daysOfWeek.includes(dayOfWeek as DayOfWeek);
        }
        break;

      case RecurrenceFrequency.MONTHLY:
        shouldInclude = true;
        break;
    }

    if (shouldInclude && !isBefore(currentDate, startDate)) {
      const eventStart = setMinutes(setHours(new Date(currentDate), hours), minutes);
      const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);

      events.push({
        id: `${recurringEvent.id}-${format(currentDate, 'yyyy-MM-dd')}`,
        title: recurringEvent.title,
        start: eventStart,
        end: eventEnd,
        description: recurringEvent.description,
        isRecurring: true,
        recurringEventId: recurringEvent.id,
        color: recurringEvent.color,
      });

      occurrenceCount++;
    }

    // Переміщення до наступної дати
    switch (recurrence.frequency) {
      case RecurrenceFrequency.DAILY:
        currentDate = addDays(currentDate, recurrence.interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        // Для weekly з конкретними днями - перевіряємо кожен день
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          currentDate = addDays(currentDate, 1);
        } else {
          currentDate = addWeeks(currentDate, recurrence.interval);
        }
        break;
      case RecurrenceFrequency.MONTHLY:
        currentDate = addMonths(currentDate, recurrence.interval);
        break;
    }
  }

  return events;
}

/**
 * Створює текстовий опис правила повторення
 */
export function getRecurrenceDescription(rule: RecurrenceRule): string {
  const { frequency, interval, daysOfWeek } = rule;

  const dayNames = {
    [DayOfWeek.MONDAY]: 'Пн',
    [DayOfWeek.TUESDAY]: 'Вт',
    [DayOfWeek.WEDNESDAY]: 'Ср',
    [DayOfWeek.THURSDAY]: 'Чт',
    [DayOfWeek.FRIDAY]: 'Пт',
    [DayOfWeek.SATURDAY]: 'Сб',
    [DayOfWeek.SUNDAY]: 'Нд',
  };

  switch (frequency) {
    case RecurrenceFrequency.DAILY:
      return interval === 1 ? 'Щодня' : `Кожні ${interval} дні`;

    case RecurrenceFrequency.WEEKLY:
      if (daysOfWeek && daysOfWeek.length > 0) {
        const days = daysOfWeek.map(d => dayNames[d]).join(', ');
        return interval === 1 ? `Щотижня: ${days}` : `Кожні ${interval} тижні: ${days}`;
      }
      return interval === 1 ? 'Щотижня' : `Кожні ${interval} тижні`;

    case RecurrenceFrequency.MONTHLY:
      return interval === 1 ? 'Щомісяця' : `Кожні ${interval} місяці`;

    default:
      return 'Повторюється';
  }
}
