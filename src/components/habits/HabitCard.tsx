'use client';

import { HabitWithStreak, HabitTrackingType } from '@/types/habits';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Calendar, Target } from 'lucide-react';
import { useHabits } from '@/contexts/HabitsContext';
import { useConfirm } from '@/hooks/use-confirm';
import { useState } from 'react';
import QuickValueInput from './QuickValueInput';
import { Progress } from '@/components/ui/progress';

interface HabitCardProps {
  habit: HabitWithStreak;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const { completeHabit, deleteHabit, uncompleteHabit } = useHabits();
  const confirm = useConfirm();
  const [showValueInput, setShowValueInput] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCheckboxChange = async (checked: boolean) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);

      if (checked) {
        // Complete habit
        if (habit.trackingType === HabitTrackingType.BOOLEAN) {
          await completeHabit(habit.id, {
            completionDate: new Date(),
          });
        } else {
          // Show value input for numeric/duration
          setShowValueInput(true);
        }
      } else {
        // Uncomplete habit
        await uncompleteHabit(habit.id, new Date());
      }
    } catch (error) {
      console.error('Error updating habit completion:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Видалити звичку?',
      description: `Ви впевнені, що хочете видалити звичку "${habit.name}"? Всі дані про виконання будуть втрачені.`,
      variant: 'destructive',
    });

    if (confirmed) {
      await deleteHabit(habit.id);
    }
  };

  // Get frequency display text
  const getFrequencyText = () => {
    switch (habit.frequencyType) {
      case 'daily':
        return 'Щодня';
      case 'weekly':
        return `${habit.frequencyCount || 1}x/тиждень`;
      case 'monthly':
        return `${habit.frequencyCount || 1}x/місяць`;
      case 'interval':
        return `Кожні ${habit.intervalDays || 1} днів`;
      default:
        return habit.frequencyType;
    }
  };

  // Get target display text
  const getTargetText = () => {
    if (habit.trackingType === HabitTrackingType.BOOLEAN) {
      return null;
    }

    if (habit.targetValue && habit.unit) {
      return `Ціль: ${habit.targetValue} ${habit.unit}`;
    }

    return null;
  };

  // Calculate today's progress for numeric/duration habits
  const getTodayProgress = () => {
    if (
      !habit.todayCompletion ||
      habit.trackingType === HabitTrackingType.BOOLEAN
    ) {
      return null;
    }

    const current =
      habit.todayCompletion.value || habit.todayCompletion.durationMinutes || 0;
    const target = habit.targetValue || 100;
    const percent = Math.min(Math.round((current / target) * 100), 100);

    return { current, target, percent };
  };

  const todayProgress = getTodayProgress();

  return (
    <>
      <Card className="bg-white dark:bg-card hover:shadow-lg transition-shadow group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={habit.todayCompleted || false}
                onCheckedChange={handleCheckboxChange}
                disabled={isUpdating}
                className="h-5 w-5"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {habit.icon || '✓'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {habit.name}
                    </h3>
                    {habit.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {getFrequencyText()}
                </Badge>

                {habit.streak && habit.streak.currentStreak > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    🔥 {habit.streak.currentStreak} днів
                  </Badge>
                )}

                {habit.category && (
                  <Badge variant="outline" className="text-xs">
                    {habit.category.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              {/* Progress (for numeric/duration habits) */}
              {todayProgress && (
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Сьогодні</span>
                    <span>
                      {todayProgress.current} / {todayProgress.target}{' '}
                      {habit.unit}
                    </span>
                  </div>
                  <Progress value={todayProgress.percent} className="h-1.5" />
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {habit.streak && (
                  <>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>Всього: {habit.streak.totalCompletions}</span>
                    </div>
                    {habit.streak.longestStreak > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Рекорд: {habit.streak.longestStreak} днів
                        </span>
                      </div>
                    )}
                  </>
                )}

                {getTargetText() && (
                  <div className="text-xs">{getTargetText()}</div>
                )}
              </div>

              {/* Cue (if set) */}
              {habit.cue && (
                <div className="mt-2 text-xs text-muted-foreground italic">
                  💡 {habit.cue}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Value Input Dialog */}
      {showValueInput && (
        <QuickValueInput
          habitId={habit.id}
          onClose={() => setShowValueInput(false)}
          onComplete={() => {
            setShowValueInput(false);
            setIsUpdating(false);
          }}
        />
      )}
    </>
  );
}
