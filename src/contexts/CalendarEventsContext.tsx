'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import type {
  CalendarEventWithGoal,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/types/calendar-events';

interface CalendarEventsContextType {
  events: CalendarEventWithGoal[];
  loading: boolean;
  error: string | null;
  fetchEvents: (startDate?: string, endDate?: string, goalId?: string) => Promise<void>;
  refetch: () => Promise<void>;
  createEvent: (event: CreateCalendarEventInput) => Promise<CalendarEventWithGoal>;
  updateEvent: (id: string, updates: UpdateCalendarEventInput) => Promise<CalendarEventWithGoal | null>;
  deleteEvent: (id: string) => Promise<void>;
  // Current date range (for refetching with same params)
  currentFilters: {
    startDate?: string;
    endDate?: string;
    goalId?: string;
  };
}

const CalendarEventsContext = createContext<CalendarEventsContextType | undefined>(undefined);

export function CalendarEventsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEventWithGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<CalendarEventsContextType['currentFilters']>({});

  // Fetch events from API with optional filters
  const fetchEvents = useCallback(
    async (startDate?: string, endDate?: string, goalId?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (goalId) params.set('goalId', goalId);

        const url = `/api/calendar-events${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 401) {
            setEvents([]);
            return;
          }

          // Try to get error details
          let errorMessage = 'Failed to fetch calendar events';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
            console.error('Calendar events fetch error:', errorData);
          } catch {
            console.error('Calendar events fetch error:', response.statusText);
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        setEvents(data.events || []);

        // Save current filters for refetch
        setCurrentFilters({ startDate, endDate, goalId });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching calendar events:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load events when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      // Fetch events for current month by default
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      fetchEvents(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );
    } else if (status === 'unauthenticated') {
      setEvents([]);
      setLoading(false);
    }
  }, [status, fetchEvents]);

  // Refetch with current filters
  const refetch = useCallback(async () => {
    if (status === 'authenticated') {
      await fetchEvents(
        currentFilters.startDate,
        currentFilters.endDate,
        currentFilters.goalId
      );
    }
  }, [status, fetchEvents, currentFilters]);

  // Create a new event via API
  const createEvent = useCallback(
    async (eventData: CreateCalendarEventInput): Promise<CalendarEventWithGoal> => {
      try {
        const response = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create event');
        }

        const { event } = await response.json();

        // Add to local state
        setEvents((prev) => [...prev, event]);

        return event;
      } catch (err) {
        console.error('Error creating calendar event:', err);
        throw err;
      }
    },
    []
  );

  // Update an existing event via API
  const updateEvent = useCallback(
    async (
      id: string,
      updates: UpdateCalendarEventInput
    ): Promise<CalendarEventWithGoal | null> => {
      try {
        const response = await fetch(`/api/calendar-events/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update event');
        }

        const { event } = await response.json();

        // Update in local state
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? event : e))
        );

        return event;
      } catch (err) {
        console.error('Error updating calendar event:', err);
        throw err;
      }
    },
    []
  );

  // Delete an event via API
  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/calendar-events/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      // Remove from local state
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      throw err;
    }
  }, []);

  return (
    <CalendarEventsContext.Provider
      value={{
        events,
        loading,
        error,
        fetchEvents,
        refetch,
        createEvent,
        updateEvent,
        deleteEvent,
        currentFilters,
      }}
    >
      {children}
    </CalendarEventsContext.Provider>
  );
}

export function useCalendarEventsContext() {
  const context = useContext(CalendarEventsContext);
  if (context === undefined) {
    throw new Error('useCalendarEventsContext must be used within a CalendarEventsProvider');
  }
  return context;
}
