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
import {
  Habit,
  HabitWithStreak,
  HabitCompletion,
  HabitFrequencyType,
  HabitTrackingType,
  CompletionFormData,
} from '@/types/habits';
import { GoalCategory } from '@/types/goals';

interface HabitsContextType {
  habits: HabitWithStreak[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<Habit | null>;
  deleteHabit: (id: string) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  completeHabit: (habitId: string, completionData: CompletionFormData) => Promise<HabitCompletion>;
  uncompleteHabit: (habitId: string, date: Date) => Promise<void>;
  getHabitsByCategory: (category: GoalCategory) => HabitWithStreak[];
  getHabitsByFrequency: (frequencyType: HabitFrequencyType) => HabitWithStreak[];
  getTodayHabits: () => HabitWithStreak[];
  getCompletionRate: (habitId: string, days: number) => Promise<number>;
  filters: {
    category: GoalCategory | null;
    frequencyType: HabitFrequencyType | null;
    trackingType: HabitTrackingType | null;
  };
  setFilters: (filters: Partial<HabitsContextType['filters']>) => void;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<HabitsContextType['filters']>({
    category: null,
    frequencyType: null,
    trackingType: null,
  });

  // Fetch habits from API
  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/habits');

      if (!response.ok) {
        if (response.status === 401) {
          setHabits([]);
          return;
        }
        throw new Error('Failed to fetch habits');
      }

      const data = await response.json();
      setHabits(data.habits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching habits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load habits when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchHabits();
    } else if (status === 'unauthenticated') {
      setHabits([]);
      setLoading(false);
    }
  }, [status, fetchHabits]);

  const refetch = useCallback(() => {
    if (status === 'authenticated') {
      fetchHabits();
    }
  }, [status, fetchHabits]);

  // Add a new habit via API
  const addHabit = useCallback(
    async (habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isActive'>) => {
      try {
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitData),
        });

        if (!response.ok) {
          throw new Error('Failed to create habit');
        }

        const { habit } = await response.json();
        setHabits((prev) => [habit, ...prev]);
        return habit;
      } catch (err) {
        console.error('Error creating habit:', err);
        throw err;
      }
    },
    []
  );

  // Update a habit via API
  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    try {
      const response = await fetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update habit');
      }

      const { habit } = await response.json();
      setHabits((prev) => prev.map((h) => (h.id === id ? habit : h)));
      return habit;
    } catch (err) {
      console.error('Error updating habit:', err);
      throw err;
    }
  }, []);

  // Delete a habit via API
  const deleteHabit = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete habit');
      }

      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Error deleting habit:', err);
      throw err;
    }
  }, []);

  // Archive a habit (soft delete)
  const archiveHabit = useCallback(
    async (id: string) => {
      try {
        await updateHabit(id, {
          isActive: false,
          archivedAt: new Date(),
        });
      } catch (err) {
        console.error('Error archiving habit:', err);
        throw err;
      }
    },
    [updateHabit]
  );

  // Complete a habit for today (or specified date)
  const completeHabit = useCallback(
    async (habitId: string, completionData: CompletionFormData) => {
      try {
        const response = await fetch(`/api/habits/${habitId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completionData),
        });

        if (!response.ok) {
          throw new Error('Failed to complete habit');
        }

        const { completion } = await response.json();

        // Refresh habits to update streaks
        await fetchHabits();

        return completion;
      } catch (err) {
        console.error('Error completing habit:', err);
        throw err;
      }
    },
    [fetchHabits]
  );

  // Uncomplete a habit for a specific date
  const uncompleteHabit = useCallback(
    async (habitId: string, date: Date) => {
      try {
        const dateStr = date.toISOString().split('T')[0];
        const response = await fetch(
          `/api/habits/${habitId}/complete?date=${dateStr}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to uncomplete habit');
        }

        // Refresh habits to update streaks
        await fetchHabits();
      } catch (err) {
        console.error('Error uncompleting habit:', err);
        throw err;
      }
    },
    [fetchHabits]
  );

  // Get habits by category
  const getHabitsByCategory = useCallback(
    (category: GoalCategory) => {
      return habits.filter((h) => h.category === category);
    },
    [habits]
  );

  // Get habits by frequency type
  const getHabitsByFrequency = useCallback(
    (frequencyType: HabitFrequencyType) => {
      return habits.filter((h) => h.frequencyType === frequencyType);
    },
    [habits]
  );

  // Get habits for today
  const getTodayHabits = useCallback(() => {
    return habits.filter((h) => {
      // For daily habits, always show
      if (h.frequencyType === HabitFrequencyType.DAILY) return true;

      // For weekly/monthly, show if not completed today
      if (
        h.frequencyType === HabitFrequencyType.WEEKLY ||
        h.frequencyType === HabitFrequencyType.MONTHLY
      ) {
        return !h.todayCompleted;
      }

      // For interval, check if due today
      if (h.frequencyType === HabitFrequencyType.INTERVAL && h.streak) {
        if (!h.streak.lastCompletionDate) return true;

        const lastDate = new Date(h.streak.lastCompletionDate);
        const today = new Date();
        const daysSince = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSince >= (h.intervalDays || 1);
      }

      return true;
    });
  }, [habits]);

  // Get completion rate for a habit over last N days
  const getCompletionRate = useCallback(
    async (habitId: string, days: number) => {
      try {
        const response = await fetch(
          `/api/habits/${habitId}/stats?days=${days}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch completion rate');
        }

        const { completionRate } = await response.json();
        return completionRate;
      } catch (err) {
        console.error('Error fetching completion rate:', err);
        return 0;
      }
    },
    []
  );

  // Filter setter
  const setFilters = useCallback(
    (newFilters: Partial<HabitsContextType['filters']>) => {
      setFiltersState((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  // Get filtered habits
  const getFilteredHabits = useCallback(() => {
    let filtered = habits;

    if (filters.category) {
      filtered = filtered.filter((h) => h.category === filters.category);
    }

    if (filters.frequencyType) {
      filtered = filtered.filter(
        (h) => h.frequencyType === filters.frequencyType
      );
    }

    if (filters.trackingType) {
      filtered = filtered.filter(
        (h) => h.trackingType === filters.trackingType
      );
    }

    return filtered;
  }, [habits, filters]);

  return (
    <HabitsContext.Provider
      value={{
        habits: getFilteredHabits(),
        loading,
        error,
        refetch,
        addHabit,
        updateHabit,
        deleteHabit,
        archiveHabit,
        completeHabit,
        uncompleteHabit,
        getHabitsByCategory,
        getHabitsByFrequency,
        getTodayHabits,
        getCompletionRate,
        filters,
        setFilters,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
}
