'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Goal, GoalConnection, GoalCategory, GoalPriority, GoalStatus } from '@/types';

const STORAGE_KEY = 'life-designer-goals';

interface GoalsContextType {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'connections'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
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

interface StorageData {
  goals: Goal[];
  lastSync: string;
}

function parseGoalDates(goal: Goal): Goal {
  return {
    ...goal,
    startDate: new Date(goal.startDate),
    targetEndDate: new Date(goal.targetEndDate),
    actualEndDate: goal.actualEndDate ? new Date(goal.actualEndDate) : undefined,
    createdAt: new Date(goal.createdAt),
    updatedAt: new Date(goal.updatedAt),
  };
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filters, setFiltersState] = useState<GoalsContextType['filters']>({
    category: null,
    priority: null,
    status: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load goals from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: StorageData = JSON.parse(stored);
          // Parse dates from strings
          const parsedGoals = data.goals.map(parseGoalDates);
          setGoals(parsedGoals);
        }
      } catch (error) {
        console.error('Error loading goals from localStorage:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        const data: StorageData = {
          goals,
          lastSync: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving goals to localStorage:', error);
      }
    }
  }, [goals, isLoaded]);

  // Add a new goal
  const addGoal = useCallback((goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'connections'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: crypto.randomUUID(),
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setGoals(prev => [...prev, newGoal]);
  }, []);

  // Update an existing goal
  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(goal =>
      goal.id === id
        ? { ...goal, ...updates, updatedAt: new Date() }
        : goal
    ));
  }, []);

  // Delete a goal
  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      // Remove the goal and all connections to/from it
      return prev
        .filter(goal => goal.id !== id)
        .map(goal => ({
          ...goal,
          connections: goal.connections.filter(
            conn => conn.fromGoalId !== id && conn.toGoalId !== id
          ),
        }));
    });
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

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within GoalsProvider');
  }
  return context;
}
