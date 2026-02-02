'use client';

import WeekSnapshotCard from './WeekSnapshotCard';

// Mock data for testing
const mockSnapshots = [
  {
    weekLabel: 'Поточний тиждень',
    weekStart: '06.01.2026',
    weekEnd: '12.01.2026',
    totalAvailable: 112,
    totalAllocated: 57,
    totalCompleted: 24,
    totalScheduled: 18,
    freeTime: 55,
    monthlyIncome: 3520.0,
    currency: 'USD',
    goals: [
      {
        id: '1',
        name: 'Life Designer розробка',
        color: '#3b82f6',
        timeAllocated: 20,
        timeCompleted: 12,
        timeScheduled: 6,
        timeUnscheduled: 2,
      },
      {
        id: '2',
        name: 'Навчання Next.js',
        color: '#8b5cf6',
        timeAllocated: 15,
        timeCompleted: 8,
        timeScheduled: 5,
        timeUnscheduled: 2,
      },
      {
        id: '3',
        name: 'Спорт та здоров\'я',
        color: '#10b981',
        timeAllocated: 12,
        timeCompleted: 4,
        timeScheduled: 4,
        timeUnscheduled: 4,
      },
      {
        id: '4',
        name: 'Читання книг',
        color: '#f59e0b',
        timeAllocated: 10,
        timeCompleted: 0,
        timeScheduled: 3,
        timeUnscheduled: 7,
      },
    ],
  },
  {
    weekLabel: 'Минулий тиждень',
    weekStart: '30.12.2025',
    weekEnd: '05.01.2026',
    totalAvailable: 112,
    totalAllocated: 60,
    totalCompleted: 45,
    totalScheduled: 8,
    freeTime: 52,
    monthlyIncome: 4200.0,
    currency: 'USD',
    goals: [
      {
        id: '1',
        name: 'Life Designer розробка',
        color: '#3b82f6',
        timeAllocated: 25,
        timeCompleted: 22,
        timeScheduled: 2,
        timeUnscheduled: 1,
      },
      {
        id: '2',
        name: 'Навчання Next.js',
        color: '#8b5cf6',
        timeAllocated: 15,
        timeCompleted: 13,
        timeScheduled: 2,
        timeUnscheduled: 0,
      },
      {
        id: '3',
        name: 'Спорт та здоров\'я',
        color: '#10b981',
        timeAllocated: 12,
        timeCompleted: 8,
        timeScheduled: 3,
        timeUnscheduled: 1,
      },
      {
        id: '4',
        name: 'Читання книг',
        color: '#f59e0b',
        timeAllocated: 8,
        timeCompleted: 2,
        timeScheduled: 1,
        timeUnscheduled: 5,
      },
    ],
  },
  {
    weekLabel: '2 тижні тому',
    weekStart: '23.12.2025',
    weekEnd: '29.12.2025',
    totalAvailable: 112,
    totalAllocated: 45,
    totalCompleted: 38,
    totalScheduled: 5,
    freeTime: 67,
    monthlyIncome: 2800.0,
    currency: 'USD',
    goals: [
      {
        id: '1',
        name: 'Life Designer розробка',
        color: '#3b82f6',
        timeAllocated: 18,
        timeCompleted: 16,
        timeScheduled: 2,
        timeUnscheduled: 0,
      },
      {
        id: '2',
        name: 'Навчання Next.js',
        color: '#8b5cf6',
        timeAllocated: 12,
        timeCompleted: 10,
        timeScheduled: 2,
        timeUnscheduled: 0,
      },
      {
        id: '3',
        name: 'Спорт та здоров\'я',
        color: '#10b981',
        timeAllocated: 10,
        timeCompleted: 8,
        timeScheduled: 1,
        timeUnscheduled: 1,
      },
      {
        id: '4',
        name: 'Читання книг',
        color: '#f59e0b',
        timeAllocated: 5,
        timeCompleted: 4,
        timeScheduled: 0,
        timeUnscheduled: 1,
      },
    ],
  },
];

export default function WeekSnapshotDemo() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Історія тижнів</h2>
        <p className="text-muted-foreground">
          Тестові дані для демонстрації карточок історії
        </p>
      </div>
      {mockSnapshots.map((snapshot, index) => (
        <WeekSnapshotCard key={index} snapshot={snapshot} />
      ))}
    </div>
  );
}
