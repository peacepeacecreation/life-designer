'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  RecurringEvent,
  parseRecurringEventFromDb,
  convertRecurringEventToDbPayload,
  convertPartialUpdateToDbPayload,
  RecurringEventRow,
} from '@/types/recurring-events';

interface RecurringEventsContextType {
  recurringEvents: RecurringEvent[];
  loading: boolean;
  error: string | null;
  addRecurringEvent: (
    event: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateRecurringEvent: (id: string, updates: Partial<RecurringEvent>) => Promise<void>;
  deleteRecurringEvent: (id: string) => Promise<void>;
  toggleRecurringEvent: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const RecurringEventsContext = createContext<
  RecurringEventsContextType | undefined
>(undefined);

export function RecurringEventsProvider({ children }: { children: ReactNode }) {
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recurring events from API
  const fetchRecurringEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/recurring-events');

      if (!response.ok) {
        throw new Error('Failed to fetch recurring events');
      }

      const data = await response.json();
      const events = (data.recurringEvents || []).map((row: RecurringEventRow) =>
        parseRecurringEventFromDb(row)
      );

      setRecurringEvents(events);
    } catch (err) {
      console.error('Error fetching recurring events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchRecurringEvents();
  }, [fetchRecurringEvents]);

  // Add new recurring event
  const addRecurringEvent = useCallback(
    async (eventData: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticEvent: RecurringEvent = {
        ...eventData,
        id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRecurringEvents((prev) => [...prev, optimisticEvent]);

      try {
        const payload = convertRecurringEventToDbPayload(eventData);
        const response = await fetch('/api/recurring-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to create recurring event');
        }

        const data = await response.json();
        const newEvent = parseRecurringEventFromDb(data.recurringEvent);

        // Replace optimistic with real data
        setRecurringEvents((prev) =>
          prev.map((event) => (event.id === tempId ? newEvent : event))
        );
      } catch (err) {
        console.error('Error creating recurring event:', err);
        // Revert optimistic update
        setRecurringEvents((prev) => prev.filter((event) => event.id !== tempId));
        throw err;
      }
    },
    []
  );

  // Update recurring event
  const updateRecurringEvent = useCallback(
    async (id: string, updates: Partial<RecurringEvent>) => {
      // Optimistic update
      const previousEvents = recurringEvents;
      setRecurringEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? { ...event, ...updates, updatedAt: new Date() }
            : event
        )
      );

      try {
        const payload = convertPartialUpdateToDbPayload(updates);
        const response = await fetch(`/api/recurring-events/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update recurring event');
        }

        const data = await response.json();
        const updatedEvent = parseRecurringEventFromDb(data.recurringEvent);

        // Update with server data
        setRecurringEvents((prev) =>
          prev.map((event) => (event.id === id ? updatedEvent : event))
        );
      } catch (err) {
        console.error('Error updating recurring event:', err);
        // Revert optimistic update
        setRecurringEvents(previousEvents);
        throw err;
      }
    },
    [recurringEvents]
  );

  // Delete recurring event
  const deleteRecurringEvent = useCallback(
    async (id: string) => {
      // Optimistic update
      const previousEvents = recurringEvents;
      setRecurringEvents((prev) => prev.filter((event) => event.id !== id));

      try {
        const response = await fetch(`/api/recurring-events/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete recurring event');
        }
      } catch (err) {
        console.error('Error deleting recurring event:', err);
        // Revert optimistic update
        setRecurringEvents(previousEvents);
        throw err;
      }
    },
    [recurringEvents]
  );

  // Toggle active state
  const toggleRecurringEvent = useCallback(
    async (id: string) => {
      const event = recurringEvents.find((e) => e.id === id);
      if (!event) return;

      await updateRecurringEvent(id, { isActive: !event.isActive });
    },
    [recurringEvents, updateRecurringEvent]
  );

  const value: RecurringEventsContextType = {
    recurringEvents,
    loading,
    error,
    addRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
    toggleRecurringEvent,
    refetch: fetchRecurringEvents,
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
