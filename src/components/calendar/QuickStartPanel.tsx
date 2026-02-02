'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { useGoals } from '@/contexts/GoalsContext';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';
import { getCategoryMeta } from '@/lib/categoryConfig';
import { useToast } from '@/hooks/use-toast';
import { Goal } from '@/types';

export function QuickStartPanel() {
  const { goals } = useGoals();
  const { toast } = useToast();
  const [startingGoalId, setStartingGoalId] = useState<string | null>(null);

  // Filter only active goals
  const activeGoals = goals.filter(
    (goal) => goal.status === 'in_progress' || goal.status === 'ongoing'
  );

  const handleStartTimer = async (goal: Goal) => {
    setStartingGoalId(goal.id);

    try {
      const response = await fetch('/api/clockify/start-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goal.id,
          description: goal.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка запуску таймера');
      }

      const data = await response.json();

      toast({
        title: 'Таймер запущено',
        description: `Відстеження часу для "${goal.name}" розпочато`,
      });
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося запустити таймер',
        variant: 'destructive',
      });
    } finally {
      setStartingGoalId(null);
    }
  };

  if (activeGoals.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <div className="text-center text-sm text-muted-foreground">
          Немає активних цілей для швидкого старту
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white">
      <h3 className="text-sm font-semibold mb-3">Швидкий старт</h3>
      <div className="space-y-2">
        {activeGoals.map((goal) => {
          const categoryMeta = getCategoryMeta(goal.category);
          const isStarting = startingGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                  (() => {
                    const iconOption = getIconById(goal.iconUrl!);
                    if (iconOption) {
                      const IconComponent = iconOption.Icon;
                      return (
                        <IconComponent
                          className="h-4 w-4 flex-shrink-0"
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
                    className="h-4 w-4 object-contain flex-shrink-0"
                  />
                ) : null}
                <span className="text-sm font-medium truncate">{goal.name}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStartTimer(goal)}
                disabled={isStarting}
                className="ml-2 flex-shrink-0"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
