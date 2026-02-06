'use client';

import { useState } from 'react';
import { useHabits } from '@/contexts/HabitsContext';
import HabitsList from '@/components/habits/HabitsList';
import HabitForm from '@/components/habits/HabitForm';
import TodayHabits from '@/components/habits/TodayHabits';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';
import Link from 'next/link';

export default function HabitsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { habits, loading } = useHabits();

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Назад
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔄</span>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Мої звички
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Формуйте позитивні звички щодня
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Нова звичка
        </Button>
      </div>

      {/* Empty State */}
      {!loading && habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-8xl mb-6">🌱</div>
          <h2 className="text-2xl font-semibold mb-2 text-center">
            Формуйте позитивні звички щодня
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Створіть свою першу звичку та почніть відстежувати прогрес.
            Маленькі кроки призводять до великих змін!
          </p>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Створити першу звичку
          </Button>
        </div>
      ) : (
        /* Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Habits - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <TodayHabits />
          </div>

          {/* All Habits List - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <HabitsList />
          </div>
        </div>
      )}

      {/* Habit Form Modal */}
      <HabitForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </main>
  );
}
