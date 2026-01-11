import {
  RecurringEvent,
  RecurrenceFrequency,
  WEEKDAYS,
  DayOfWeek,
} from '@/types/recurring-events';

export function getSeedRecurringEvents(): Omit<
  RecurringEvent,
  'id' | 'createdAt' | 'updatedAt'
>[] {
  return [
    // Созвон о 13:00 в будні
    {
      title: 'Щоденний созвон',
      description: 'Регулярний робочий созвон',
      startTime: '13:00',
      duration: 60, // 1 година
      recurrence: {
        frequency: RecurrenceFrequency.WEEKLY,
        interval: 1,
        daysOfWeek: WEEKDAYS, // Пн-Пт
      },
      color: '#3b82f6',
      category: 'work_startups',
      isActive: true,
    },
    // Вечірній созвон Пн/Ср/Пт о 20:00
    {
      title: 'Вечірній созвон',
      description: 'Созвон у вечірній час',
      startTime: '20:00',
      duration: 60, // 1 година
      recurrence: {
        frequency: RecurrenceFrequency.WEEKLY,
        interval: 1,
        daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
      },
      color: '#8b5cf6', // фіолетовий
      category: 'work_startups',
      isActive: true,
    },
  ];
}
