'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type {
  TimeEntryWithDetails,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  TimeByGoalStats,
} from '@/types/clockify';

interface TimeTrackingContextType {
  entries: TimeEntryWithDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createEntry: (entry: CreateTimeEntryRequest) => Promise<TimeEntryWithDetails>;
  updateEntry: (id: string, updates: UpdateTimeEntryRequest) => Promise<TimeEntryWithDetails>;
  deleteEntry: (id: string) => Promise<void>;
  getEntriesByGoal: (goalId: string) => TimeEntryWithDetails[];
  getEntriesByDateRange: (start: Date, end: Date) => TimeEntryWithDetails[];
  getEntriesBySource: (source: 'manual' | 'clockify' | 'calendar_event') => TimeEntryWithDetails[];
  getTotalHoursForPeriod: (start: Date, end: Date) => number;
  filters: {
    startDate: Date | null;
    endDate: Date | null;
    goalId: string | null;
    source: 'manual' | 'clockify' | 'calendar_event' | null;
  };
  setFilters: (filters: Partial<TimeTrackingContextType['filters']>) => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TimeTrackingContextType['filters']>({
    startDate: null,
    endDate: null,
    goalId: null,
    source: null,
  });

  // Fetch time entries from API
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      if (filters.goalId) {
        params.append('goalId', filters.goalId);
      }
      if (filters.source) {
        params.append('source', filters.source);
      }

      const response = await fetch(`/api/time-entries?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          setEntries([]);
          return;
        }
        throw new Error('Failed to fetch time entries');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching time entries:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load entries when authenticated or filters change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchEntries();
    } else if (status === 'unauthenticated') {
      setEntries([]);
      setLoading(false);
    }
  }, [status, fetchEntries]);

  const refetch = useCallback(() => {
    if (status === 'authenticated') {
      fetchEntries();
    }
  }, [status, fetchEntries]);

  // Create a new time entry via API
  const createEntry = useCallback(async (entryData: CreateTimeEntryRequest): Promise<TimeEntryWithDetails> => {
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create time entry');
      }

      const { entry } = await response.json();

      // Add to local state
      setEntries(prev => [entry, ...prev]);

      return entry;
    } catch (err) {
      console.error('Error creating time entry:', err);
      throw err;
    }
  }, []);

  // Update a time entry via API
  const updateEntry = useCallback(async (id: string, updates: UpdateTimeEntryRequest): Promise<TimeEntryWithDetails> => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update time entry');
      }

      const { entry } = await response.json();

      // Update local state
      setEntries(prev => prev.map(e => e.id === id ? entry : e));

      return entry;
    } catch (err) {
      console.error('Error updating time entry:', err);
      throw err;
    }
  }, []);

  // Delete a time entry via API
  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete time entry');
      }

      // Remove from local state
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting time entry:', err);
      throw err;
    }
  }, []);

  // Get entries for specific goal
  const getEntriesByGoal = useCallback((goalId: string): TimeEntryWithDetails[] => {
    return entries.filter(entry => entry.goalId === goalId);
  }, [entries]);

  // Get entries within date range
  const getEntriesByDateRange = useCallback((start: Date, end: Date): TimeEntryWithDetails[] => {
    return entries.filter(entry => {
      const entryStart = new Date(entry.startTime);
      return entryStart >= start && entryStart <= end;
    });
  }, [entries]);

  // Get entries by source
  const getEntriesBySource = useCallback((source: 'manual' | 'clockify' | 'calendar_event'): TimeEntryWithDetails[] => {
    return entries.filter(entry => entry.source === source);
  }, [entries]);

  // Calculate total hours for period
  const getTotalHoursForPeriod = useCallback((start: Date, end: Date): number => {
    const entriesInRange = getEntriesByDateRange(start, end);
    const totalSeconds = entriesInRange.reduce((sum, entry) => {
      return sum + (entry.durationSeconds || 0);
    }, 0);
    return parseFloat((totalSeconds / 3600).toFixed(2));
  }, [getEntriesByDateRange]);

  // Set filters and trigger refetch
  const setFilters = useCallback((newFilters: Partial<TimeTrackingContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const value: TimeTrackingContextType = {
    entries,
    loading,
    error,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntriesByGoal,
    getEntriesByDateRange,
    getEntriesBySource,
    getTotalHoursForPeriod,
    filters,
    setFilters,
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within TimeTrackingProvider');
  }
  return context;
}
