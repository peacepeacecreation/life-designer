'use client';

import { useHabits } from '@/contexts/HabitsContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { HabitTrackingType } from '@/types/habits';
import QuickValueInput from './QuickValueInput';

export default function TodayHabits() {
  const { getTodayHabits, completeHabit, loading } = useHabits();
  const todayHabits = getTodayHabits();
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  // Calculate today's progress
  const completed = todayHabits.filter((h) => h.todayCompleted).length;
  const total = todayHabits.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleCheckboxChange = async (habitId: string, checked: boolean) => {
    const habit = todayHabits.find((h) => h.id === habitId);
    if (!habit) return;

    if (checked) {
      // For boolean habits, complete immediately
      if (habit.trackingType === HabitTrackingType.BOOLEAN) {
        await completeHabit(habitId, {
          completionDate: new Date(),
        });
      } else {
        // For numeric/duration, show input dialog
        setSelectedHabit(habitId);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Сьогодні</h2>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (todayHabits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Сьогодні</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Немає звичок на сьогодні</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Сьогодні</h2>
            <span className="text-sm text-muted-foreground">
              {completed}/{total}
            </span>
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогрес</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Today's Habits List */}
          <div className="space-y-2">
            {todayHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={habit.todayCompleted || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(habit.id, checked as boolean)
                  }
                  className="h-5 w-5"
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {habit.icon || '✓'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{habit.name}</p>
                    {habit.streak && habit.streak.currentStreak > 0 && (
                      <p className="text-xs text-muted-foreground">
                        🔥 {habit.streak.currentStreak} днів
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Motivational Message */}
          {progressPercent === 100 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                🎉 Супер! Всі звички виконано!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Value Input Dialog */}
      {selectedHabit && (
        <QuickValueInput
          habitId={selectedHabit}
          onClose={() => setSelectedHabit(null)}
          onComplete={async () => {
            setSelectedHabit(null);
          }}
        />
      )}
    </>
  );
}
