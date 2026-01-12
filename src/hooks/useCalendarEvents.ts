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

      // Додаємо goalId та використовуємо колір цілі якщо є
      const eventsWithGoalColor = generated.map(event => {
        if (recurringEvent.goalId) {
          const goal = goals.find(g => g.id === recurringEvent.goalId);
          return {
            ...event,
            goalId: recurringEvent.goalId,
            color: goal?.color || event.color || (goal ? getCategoryColor(goal.category) : undefined),
          };
        }
        return event;
      });

      allRecurringEvents.push(...eventsWithGoalColor);
    });

    return allRecurringEvents;
  }, [recurringEvents, currentDate, goals]);

  // Transform DB events to calendar format
  const dbCalendarEvents = useMemo(() => {
    return dbEvents.map((event) => {
      // Get the current goal from context to ensure color is up-to-date
      const currentGoal = event.goalId ? goals.find(g => g.id === event.goalId) : null;

      return {
        id: event.id,
        title: event.title,
        start: event.startTime instanceof Date ? event.startTime : new Date(Date.parse(event.startTime as any)),
        end: event.endTime instanceof Date ? event.endTime : new Date(Date.parse(event.endTime as any)),
        description: event.description,
        location: event.location,
        isFromDb: true,
        // Пріоритет: колір цілі з контексту > колір події > колір категорії
        color: currentGoal?.color || event.goal?.color || event.color || (currentGoal ? getCategoryColor(currentGoal.category) : event.goal ? getCategoryColor(event.goal.category) : undefined),
        goalId: event.goalId,
      };
    });
  }, [dbEvents, goals]);

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
