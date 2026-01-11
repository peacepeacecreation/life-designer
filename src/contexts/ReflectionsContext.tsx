'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Reflection, ReflectionType } from '@/types/reflections';

interface ReflectionsContextType {
  reflections: Reflection[];
  isLoading: boolean;
  error: string | null;
  addReflection: (reflection: Omit<Reflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Reflection | null>;
  updateReflection: (id: string, updates: Partial<Reflection>) => Promise<Reflection | null>;
  deleteReflection: (id: string) => Promise<boolean>;
  refreshReflections: () => Promise<void>;
  getReflectionsByType: (type: ReflectionType) => Reflection[];
  getReflectionsByDateRange: (startDate: Date, endDate: Date) => Reflection[];
  getFilteredReflections: () => Reflection[];
  filters: {
    type: ReflectionType | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    minMoodScore: number | null;
    minEnergyLevel: number | null;
  };
  setFilters: (filters: Partial<ReflectionsContextType['filters']>) => void;
}

const ReflectionsContext = createContext<ReflectionsContextType | undefined>(undefined);

export function ReflectionsProvider({ children }: { children: ReactNode }) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ReflectionsContextType['filters']>({
    type: null,
    dateFrom: null,
    dateTo: null,
    minMoodScore: null,
    minEnergyLevel: null,
  });

  // Fetch reflections from API
  const fetchReflections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/reflections');

      // Handle unauthenticated or server error state gracefully
      if (response.status === 401 || response.status === 500) {
        // Silently set empty reflections array - API not ready or not authenticated
        setReflections([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch reflections');
      }

      const data = await response.json();

      // Parse dates from ISO strings
      const parsedReflections = data.reflections.map((reflection: any) => ({
        ...reflection,
        reflectionDate: new Date(reflection.reflectionDate),
        createdAt: new Date(reflection.createdAt),
        updatedAt: new Date(reflection.updatedAt),
      }));

      setReflections(parsedReflections);
    } catch (err: any) {
      // Silently handle errors - just set empty array
      setReflections([]);
      setError(null); // Don't propagate error to UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load reflections on mount
  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  // Add a new reflection
  const addReflection = useCallback(async (reflectionData: Omit<Reflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Reflection | null> => {
    try {
      setError(null);

      const response = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reflectionData),
      });

      if (!response.ok) {
        throw new Error('Failed to create reflection');
      }

      const data = await response.json();
      const newReflection = {
        ...data.reflection,
        reflectionDate: new Date(data.reflection.reflectionDate),
        createdAt: new Date(data.reflection.createdAt),
        updatedAt: new Date(data.reflection.updatedAt),
      };

      setReflections(prev => [newReflection, ...prev]);
      return newReflection;
    } catch (err: any) {
      console.error('Error adding reflection:', err);
      setError(err.message || 'Failed to create reflection');
      return null;
    }
  }, []);

  // Update an existing reflection
  const updateReflection = useCallback(async (id: string, updates: Partial<Reflection>): Promise<Reflection | null> => {
    try {
      setError(null);

      const response = await fetch(`/api/reflections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update reflection');
      }

      const data = await response.json();
      const updatedReflection = {
        ...data.reflection,
        reflectionDate: new Date(data.reflection.reflectionDate),
        createdAt: new Date(data.reflection.createdAt),
        updatedAt: new Date(data.reflection.updatedAt),
      };

      setReflections(prev => prev.map(reflection =>
        reflection.id === id ? updatedReflection : reflection
      ));

      return updatedReflection;
    } catch (err: any) {
      console.error('Error updating reflection:', err);
      setError(err.message || 'Failed to update reflection');
      return null;
    }
  }, []);

  // Delete a reflection
  const deleteReflection = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/reflections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete reflection');
      }

      setReflections(prev => prev.filter(reflection => reflection.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting reflection:', err);
      setError(err.message || 'Failed to delete reflection');
      return false;
    }
  }, []);

  // Refresh reflections (refetch from API)
  const refreshReflections = useCallback(async () => {
    await fetchReflections();
  }, [fetchReflections]);

  // Get reflections by type
  const getReflectionsByType = useCallback((type: ReflectionType): Reflection[] => {
    return reflections.filter(reflection => reflection.reflectionType === type);
  }, [reflections]);

  // Get reflections by date range
  const getReflectionsByDateRange = useCallback((startDate: Date, endDate: Date): Reflection[] => {
    return reflections.filter(reflection => {
      const reflectionDate = reflection.reflectionDate;
      return reflectionDate >= startDate && reflectionDate <= endDate;
    });
  }, [reflections]);

  // Get filtered reflections based on current filters
  const getFilteredReflections = useCallback((): Reflection[] => {
    return reflections.filter(reflection => {
      if (filters.type && reflection.reflectionType !== filters.type) return false;
      if (filters.dateFrom && reflection.reflectionDate < filters.dateFrom) return false;
      if (filters.dateTo && reflection.reflectionDate > filters.dateTo) return false;
      if (filters.minMoodScore !== null && (reflection.moodScore === undefined || reflection.moodScore < filters.minMoodScore)) return false;
      if (filters.minEnergyLevel !== null && (reflection.energyLevel === undefined || reflection.energyLevel < filters.minEnergyLevel)) return false;
      return true;
    });
  }, [reflections, filters]);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<ReflectionsContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const value: ReflectionsContextType = {
    reflections,
    isLoading,
    error,
    addReflection,
    updateReflection,
    deleteReflection,
    refreshReflections,
    getReflectionsByType,
    getReflectionsByDateRange,
    getFilteredReflections,
    filters,
    setFilters,
  };

  return (
    <ReflectionsContext.Provider value={value}>
      {children}
    </ReflectionsContext.Provider>
  );
}

export function useReflections() {
  const context = useContext(ReflectionsContext);
  if (!context) {
    throw new Error('useReflections must be used within ReflectionsProvider');
  }
  return context;
}
