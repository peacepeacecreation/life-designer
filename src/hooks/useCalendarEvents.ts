import { useState, useEffect, useMemo } from 'react';
import { useRecurringEvents } from '@/contexts/RecurringEventsContext';
import { useGoals } from '@/contexts/GoalsContext';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { generateEventsFromRecurring } from '@/utils/recurringEvents';
import { startOfMonth, endOfMonth } from 'date-fns';
import { GoalCategory } from '@/types/goals';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  htmlLink?: string;
  isRecurring?: boolean;
  isFromDb?: boolean;
  color?: string;
  goalId?: string;
}

interface UseCalendarEventsOptions {
  showRecurringEvents?: boolean;
  hiddenGoalIds?: string[];
  hiddenCategories?: GoalCategory[];
  currentView?: 'month' | 'week' | 'day' | 'agenda';
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const { recurringEvents } = useRecurringEvents();
  const { goals } = useGoals();
  const { events: dbEvents, fetchEvents: fetchDbEvents } = useCalendarEventsContext();
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    showRecurringEvents = true,
    hiddenGoalIds = [],
    hiddenCategories = [],
    currentView = 'month',
  } = options;

  // Функція для перевірки видимості події на основі goalId
  const isEventVisible = (event: CalendarEvent): boolean => {
    // Повторювані події ховаємо тільки в місячному вигляді
    // DB події та Google події завжди показуємо
    if (event.isRecurring && !showRecurringEvents && currentView === 'month') {
      return false;
    }

    // Якщо є goalId події
    if (event.goalId) {
      // Якщо goalId в списку прихованих, ховаємо
      if (hiddenGoalIds.includes(event.goalId)) {
        return false;
      }

      // Знаходимо ціль та перевіряємо категорію
      const goal = goals.find((g) => g.id === event.goalId);
      if (goal && hiddenCategories.includes(goal.category)) {
        return false;
      }
    }

    return true;
  };

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

  // Transform DB events to calendar format
  const dbCalendarEvents = useMemo(() => {
    return dbEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      description: event.description,
      location: event.location,
      isFromDb: true,
      color: event.color || (event.goal ? getCategoryColor(event.goal.category) : undefined),
      goalId: event.goalId,
    }));
  }, [dbEvents]);

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    const { getCategoryMeta } = require('@/lib/categoryConfig');
    return getCategoryMeta(category as any)?.color;
  };

  // Fetch DB events when current date changes
  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    fetchDbEvents(start.toISOString(), end.toISOString());
  }, [currentDate, fetchDbEvents]);

  // Об'єднання DB, Google та повторюваних подій з фільтрацією
  const allEvents = useMemo(() => {
    const combined = [...dbCalendarEvents, ...googleEvents, ...recurringCalendarEvents];
    return combined.filter(isEventVisible);
  }, [dbCalendarEvents, googleEvents, recurringCalendarEvents, showRecurringEvents, hiddenGoalIds, hiddenCategories, goals, currentView]);

  return {
    events: allEvents,
    dbEvents: dbCalendarEvents,
    googleEvents,
    recurringEvents: recurringCalendarEvents,
    setGoogleEvents,
    setCurrentDate,
  };
}
