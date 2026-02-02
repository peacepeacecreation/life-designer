'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Loader2, Square, Clock, RefreshCw, Pause, X } from 'lucide-react';
import { useGoals } from '@/contexts/GoalsContext';
import { useClockify } from '@/contexts/ClockifyContext';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';
import { getCategoryMeta } from '@/lib/categoryConfig';
import { useToast } from '@/hooks/use-toast';

const LAST_GOAL_KEY = 'clockify_last_goal_id';

// Format seconds to HH:MM:SS
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function QuickStartCompact() {
  const { goals } = useGoals();
  const { entries, refetchEntries } = useClockify();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Find active timer (entry without end_time)
  const activeTimer = entries.find(entry => !entry.end_time);

  // Update elapsed time every second for active timer
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeTimer.start_time).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Load last selected goal from localStorage
  useEffect(() => {
    const lastGoalId = localStorage.getItem(LAST_GOAL_KEY);
    if (lastGoalId && goals.find((g) => g.id === lastGoalId)) {
      setSelectedGoalId(lastGoalId);
    }
  }, [goals]);

  const handleGoalChange = (goalId: string) => {
    setSelectedGoalId(goalId);
    // Save to localStorage
    localStorage.setItem(LAST_GOAL_KEY, goalId);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await refetchEntries();
      toast({
        title: 'Синхронізовано',
        description: 'Записи оновлено',
      });
    } catch (error) {
      toast({
        title: 'Помилка',
        description: 'Не вдалося синхронізувати',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelTimer = async () => {
    if (!activeTimer) return;

    setIsCanceling(true);
    try {
      const response = await fetch('/api/clockify/delete-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryId: activeTimer.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка відміни таймера');
      }

      toast({
        title: 'Таймер скасовано',
        description: 'Запис видалено',
      });

      // Refresh entries immediately
      setTimeout(() => {
        refetchEntries();
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося скасувати таймер',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleStartTimer = async () => {
    // If active timer exists - stop it
    if (activeTimer) {
      setIsStarting(true);
      try {
        const response = await fetch('/api/clockify/stop-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeEntryId: activeTimer.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Помилка зупинки таймера');
        }

        toast({
          title: 'Таймер зупинено',
          description: `Час: ${formatElapsedTime(elapsedTime)}`,
        });

        // Refresh entries immediately
        setTimeout(() => {
          refetchEntries();
        }, 1000);
      } catch (error: any) {
        toast({
          title: 'Помилка',
          description: error.message || 'Не вдалося зупинити таймер',
          variant: 'destructive',
        });
      } finally {
        setIsStarting(false);
      }
      return;
    }

    // Start new timer
    if (!selectedGoalId) {
      toast({
        title: 'Помилка',
        description: 'Будь ласка, оберіть ціль',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Помилка',
        description: 'Будь ласка, введіть опис',
        variant: 'destructive',
      });
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch('/api/clockify/start-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: selectedGoalId, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка запуску таймера');
      }

      const data = await response.json();

      // Show different message if project was created
      if (data.projectCreated) {
        toast({
          title: 'Проєкт створено і таймер запущено',
          description: `Новий проєкт в Clockify автоматично створено для вашої цілі`,
        });
      } else {
        toast({
          title: 'Таймер запущено',
          description: `Відстеження часу розпочато`,
        });
      }

      // Clear description after successful start
      setDescription('');

      // Refresh entries after delay (allow Clockify API to process)
      setTimeout(() => {
        refetchEntries();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося запустити таймер',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  if (goals.length === 0) {
    return (
      <Card className="p-4 bg-white">
        <div className="text-center text-sm text-muted-foreground">
          Немає цілей
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white">
      <div className="space-y-3">
        {/* Active Timer Display */}
        {activeTimer && (() => {
          const activeGoal = goals.find(g => g.id === activeTimer.goal_id);
          const categoryMeta = activeGoal ? getCategoryMeta(activeGoal.category) : null;

          return (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeGoal?.iconUrl && isPredefinedIcon(activeGoal.iconUrl) ? (
                    (() => {
                      const iconOption = getIconById(activeGoal.iconUrl!);
                      if (iconOption) {
                        const IconComponent = iconOption.Icon;
                        return (
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: activeGoal.color || categoryMeta?.color }}
                          />
                        );
                      }
                      return null;
                    })()
                  ) : activeGoal?.iconUrl ? (
                    <img
                      src={activeGoal.iconUrl}
                      alt={activeGoal.name}
                      className="h-5 w-5 object-contain"
                    />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      {activeTimer.description || 'Без опису'}
                    </p>
                    {activeTimer.goal_name && (
                      <p className="text-xs text-amber-700">{activeTimer.goal_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-amber-600">
                    {formatElapsedTime(elapsedTime)}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

{!activeTimer && (
          <>
            <Textarea
              placeholder="Опис задачі..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />

            <div className="flex gap-2">
              <Select value={selectedGoalId} onValueChange={handleGoalChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Оберіть ціль..." />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => {
                    const categoryMeta = getCategoryMeta(goal.category);

                    return (
                      <SelectItem key={goal.id} value={goal.id}>
                        <div className="flex items-center gap-2">
                          {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                            (() => {
                              const iconOption = getIconById(goal.iconUrl!);
                              if (iconOption) {
                                const IconComponent = iconOption.Icon;
                                return (
                                  <IconComponent
                                    className="h-4 w-4"
                                    style={{ color: goal.color || categoryMeta?.color }}
                                  />
                                );
                              }
                              return null;
                            })()
                          ) : goal.iconUrl ? (
                            <img
                              src={goal.iconUrl}
                              alt={goal.name}
                              className="h-4 w-4 object-contain"
                            />
                          ) : null}
                          <span>{goal.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Button
                onClick={handleStartTimer}
                disabled={!selectedGoalId || !description.trim() || isStarting}
                className="gap-2"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Запуск...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Почати</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Синхронізувати"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </>
        )}

        {activeTimer && (
          <div className="flex gap-2">
            <Button
              onClick={handleStartTimer}
              className="gap-2"
              variant="outline"
              disabled={isStarting || isCanceling}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Зупинка...</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Пауза</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleStartTimer}
              className="gap-2 flex-1"
              variant="destructive"
              disabled={isStarting || isCanceling}
            >
              <Square className="h-4 w-4" />
              <span>Зупинити</span>
            </Button>

            <Button
              onClick={handleCancelTimer}
              disabled={isCanceling || isStarting}
              variant="outline"
              size="icon"
              className="shrink-0 !text-red-600 !border-red-600 hover:!bg-red-600 hover:!text-white"
              title="Відмінити"
            >
              {isCanceling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Синхронізувати"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
