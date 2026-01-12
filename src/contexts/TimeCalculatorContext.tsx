'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from 'react';
import { useRecurringEvents } from './RecurringEventsContext';
import { useGlobalSettings } from './GlobalSettingsContext';
import { useGoals } from './GoalsContext';
import { calculateTimeAllocation } from '@/utils/timeCalculator';

interface TimeAllocation {
  totalAvailableHours: number;      // Загальна кількість годин в робочому тижні
  scheduledHours: number;            // Час запланований в календарі
  goalsHours: number;                // Час ще треба запланувати для цілей
  freeHours: number;                 // Вільний час
  usedHours: number;                 // Загалом використано (заплановані + цілі)
  usedPercentage: number;            // Відсоток використаного часу
}

interface TimeCalculatorContextType {
  timeAllocation: TimeAllocation;
  isOverloaded: boolean;             // Чи перевантажений розклад (>95%)
  isNearCapacity: boolean;           // Чи близько до межі (80-95%)
  isOptimal: boolean;                // Чи оптимальне навантаження (<80%)
}

const TimeCalculatorContext = createContext<TimeCalculatorContextType | undefined>(undefined);

export function TimeCalculatorProvider({ children }: { children: ReactNode }) {
  const { recurringEvents } = useRecurringEvents();
  const { settings } = useGlobalSettings();
  const { goals } = useGoals();

  const timeAllocation = useMemo(() => {
    const allocation = calculateTimeAllocation(recurringEvents, settings.workHours, goals);

    const usedHours = allocation.scheduledHours + allocation.goalsHours;
    const usedPercentage = (usedHours / allocation.totalAvailableHours) * 100;

    return {
      ...allocation,
      usedHours,
      usedPercentage,
    };
  }, [recurringEvents, settings.workHours, goals]);

  const isOverloaded = timeAllocation.usedPercentage > 95;
  const isNearCapacity = timeAllocation.usedPercentage > 80 && timeAllocation.usedPercentage <= 95;
  const isOptimal = timeAllocation.usedPercentage <= 80;

  const value: TimeCalculatorContextType = {
    timeAllocation,
    isOverloaded,
    isNearCapacity,
    isOptimal,
  };

  return (
    <TimeCalculatorContext.Provider value={value}>
      {children}
    </TimeCalculatorContext.Provider>
  );
}

export function useTimeCalculator() {
  const context = useContext(TimeCalculatorContext);
  if (!context) {
    throw new Error('useTimeCalculator must be used within TimeCalculatorProvider');
  }
  return context;
}
