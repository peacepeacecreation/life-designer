import { useState, useEffect, useMemo } from 'react';
import { useRecurringEvents } from '@/contexts/RecurringEventsContext';
import { generateEventsFromRecurring } from '@/utils/recurringEvents';
import { startOfMonth, endOfMonth } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  htmlLink?: string;
  isRecurring?: boolean;
}

export function useCalendarEvents() {
  const { recurringEvents } = useRecurringEvents();
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Генерація подій з повторюваних правил для поточного місяця
  const recurringCalendarEvents = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const allRecurringEvents: CalendarEvent[] = [];

    recurringEvents.forEach((recurringEvent) => {
      const generated = generateEventsFromRecurring(
        recurringEvent,
        start,
        end
      );
      allRecurringEvents.push(...generated);
    });

    return allRecurringEvents;
  }, [recurringEvents, currentDate]);

  // Об'єднання Google та повторюваних подій
  const allEvents = useMemo(() => {
    return [...googleEvents, ...recurringCalendarEvents];
  }, [googleEvents, recurringCalendarEvents]);

  return {
    events: allEvents,
    googleEvents,
    recurringEvents: recurringCalendarEvents,
    setGoogleEvents,
    setCurrentDate,
  };
}
