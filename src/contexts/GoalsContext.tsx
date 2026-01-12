'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Goal, GoalConnection, GoalCategory, GoalPriority, GoalStatus } from '@/types';

interface GoalsContextType {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'connections'>) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal | null>;
  deleteGoal: (id: string) => Promise<void>;
  addConnection: (connection: Omit<GoalConnection, 'id'>) => void;
  removeConnection: (goalId: string, connectionId: string) => void;
  getGoalsByCategory: (category: GoalCategory) => Goal[];
  getTotalTimeAllocated: () => number;
  getOvercommitmentRisk: () => number;
  getFilteredGoals: () => Goal[];
  filters: {
    category: GoalCategory | null;
    priority: GoalPriority | null;
    status: GoalStatus | null;
  };
  setFilters: (filters: Partial<GoalsContextType['filters']>) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<GoalsContextType['filters']>({
    category: null,
    priority: null,
    status: null,
  });

  // Fetch goals from API
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/goals');

      if (!response.ok) {
        if (response.status === 401) {
          setGoals([]);
          return;
        }
        throw new Error('Failed to fetch goals');
      }

      const data = await response.json();
      setGoals(data.goals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load goals when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchGoals();
    } else if (status === 'unauthenticated') {
      setGoals([]);
      setLoading(false);
    }
  }, [status, fetchGoals]);

  const refetch = useCallback(() => {
    if (status === 'authenticated') {
      fetchGoals();
    }
  }, [status, fetchGoals]);

  // Add a new goal via API
  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'connections'>) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      const { goal } = await response.json();
      setGoals(prev => [goal, ...prev]);
      return goal;
    } catch (err) {
      console.error('Error creating goal:', err);
      throw err;
    }
  }, []);

  // Update an existing goal via API
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>): Promise<Goal | null> => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      const { goal } = await response.json();
      setGoals(prev => prev.map(g => g.id === id ? goal : g));
      return goal;
    } catch (err) {
      console.error('Error updating goal:', err);
      throw err;
    }
  }, []);

  // Delete a goal via API
  const deleteGoal = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting goal:', err);
      throw err;
    }
  }, []);

  // Add a connection between goals
  const addConnection = useCallback((connectionData: Omit<GoalConnection, 'id'>) => {
    const newConnection: GoalConnection = {
      ...connectionData,
      id: crypto.randomUUID(),
    };

    setGoals(prev => prev.map(goal =>
      goal.id === connectionData.fromGoalId
        ? { ...goal, connections: [...goal.connections, newConnection], updatedAt: new Date() }
        : goal
    ));
  }, []);

  // Remove a connection
  const removeConnection = useCallback((goalId: string, connectionId: string) => {
    setGoals(prev => prev.map(goal =>
      goal.id === goalId
        ? {
            ...goal,
            connections: goal.connections.filter(conn => conn.id !== connectionId),
            updatedAt: new Date(),
          }
        : goal
    ));
  }, []);

  // Get goals by category
  const getGoalsByCategory = useCallback((category: GoalCategory): Goal[] => {
    return goals.filter(goal => goal.category === category);
  }, [goals]);

  // Get total time allocated across all goals
  const getTotalTimeAllocated = useCallback((): number => {
    return goals.reduce((total, goal) => total + goal.timeAllocated, 0);
  }, [goals]);

  // Calculate overcommitment risk (0-100)
  const getOvercommitmentRisk = useCallback((): number => {
    const totalHours = getTotalTimeAllocated();
    const maxRecommendedHours = 60; // Recommended max hours per week
    const criticalHours = 80; // Critical threshold

    if (totalHours <= maxRecommendedHours) {
      return 0; // No risk
    } else if (totalHours >= criticalHours) {
      return 100; // Maximum risk
    } else {
      // Linear scale between recommended and critical
      return Math.round(((totalHours - maxRecommendedHours) / (criticalHours - maxRecommendedHours)) * 100);
    }
  }, [getTotalTimeAllocated]);

  // Get filtered goals based on current filters
  const getFilteredGoals = useCallback((): Goal[] => {
    return goals.filter(goal => {
      if (filters.category && goal.category !== filters.category) return false;
      if (filters.priority && goal.priority !== filters.priority) return false;
      if (filters.status && goal.status !== filters.status) return false;
      return true;
    });
  }, [goals, filters]);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<GoalsContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const value: GoalsContextType = {
    goals,
    loading,
    error,
    refetch,
    addGoal,
    updateGoal,
    deleteGoal,
    addConnection,
    removeConnection,
    getGoalsByCategory,
    getTotalTimeAllocated,
    getOvercommitmentRisk,
    getFilteredGoals,
    filters,
    setFilters,
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(customFilters?: Partial<GoalsContextType['filters']>) {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within GoalsProvider');
  }

  // If custom filters are provided, return filtered goals
  if (customFilters) {
    const filteredGoals = context.goals.filter(goal => {
      if (customFilters.category && goal.category !== customFilters.category) return false;
      if (customFilters.priority && goal.priority !== customFilters.priority) return false;
      if (customFilters.status && goal.status !== customFilters.status) return false;
      return true;
    });

    return {
      ...context,
      goals: filteredGoals,
    };
  }

  return context;
}
