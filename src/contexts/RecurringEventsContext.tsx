'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { RecurringEvent } from '@/types/recurring-events';

const STORAGE_KEY = 'life-designer-recurring-events';

interface RecurringEventsContextType {
  recurringEvents: RecurringEvent[];
  addRecurringEvent: (
    event: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateRecurringEvent: (id: string, updates: Partial<RecurringEvent>) => void;
  deleteRecurringEvent: (id: string) => void;
  toggleRecurringEvent: (id: string) => void;
}

const RecurringEventsContext = createContext<
  RecurringEventsContextType | undefined
>(undefined);

interface StorageData {
  recurringEvents: RecurringEvent[];
  lastSync: string;
}

function parseRecurringEventDates(event: RecurringEvent): RecurringEvent {
  return {
    ...event,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    recurrence: {
      ...event.recurrence,
      endDate: event.recurrence.endDate
        ? new Date(event.recurrence.endDate)
        : undefined,
    },
  };
}

export function RecurringEventsProvider({ children }: { children: ReactNode }) {
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: StorageData = JSON.parse(stored);
          const parsed = data.recurringEvents.map(parseRecurringEventDates);
          setRecurringEvents(parsed);
        }
      } catch (error) {
        console.error('Error loading recurring events:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        const data: StorageData = {
          recurringEvents,
          lastSync: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving recurring events:', error);
      }
    }
  }, [recurringEvents, isLoaded]);

  const addRecurringEvent = useCallback(
    (eventData: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newEvent: RecurringEvent = {
        ...eventData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRecurringEvents((prev) => [...prev, newEvent]);
    },
    []
  );

  const updateRecurringEvent = useCallback(
    (id: string, updates: Partial<RecurringEvent>) => {
      setRecurringEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? { ...event, ...updates, updatedAt: new Date() }
            : event
        )
      );
    },
    []
  );

  const deleteRecurringEvent = useCallback((id: string) => {
    setRecurringEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const toggleRecurringEvent = useCallback((id: string) => {
    setRecurringEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? { ...event, isActive: !event.isActive, updatedAt: new Date() }
          : event
      )
    );
  }, []);

  const value: RecurringEventsContextType = {
    recurringEvents,
    addRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
    toggleRecurringEvent,
  };

  return (
    <RecurringEventsContext.Provider value={value}>
      {children}
    </RecurringEventsContext.Provider>
  );
}

export function useRecurringEvents() {
  const context = useContext(RecurringEventsContext);
  if (!context) {
    throw new Error(
      'useRecurringEvents must be used within RecurringEventsProvider'
    );
  }
  return context;
}
