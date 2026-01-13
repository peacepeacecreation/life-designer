'use client';

import { useMemo } from 'react';
import { Goal } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { statusLabels, getCategoryMeta } from '@/lib/categoryConfig';

interface GoalProgressListProps {
  goals: Goal[];
}

export function GoalProgressList({ goals }: GoalProgressListProps) {
  // Сортуємо цілі по назві (progressPercentage removed)
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => a.name.localeCompare(b.name));
  }, [goals]);

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Немає цілей для відображення
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedGoals.map((goal) => {
        const categoryMeta = getCategoryMeta(goal.category);

        return (
          <Card key={goal.id} className="p-6 bg-white dark:bg-card hover:shadow-md transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-black dark:text-white mb-1">
                    {goal.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{categoryMeta.name}</p>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {statusLabels[goal.status]}
                </Badge>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Час: </span>
                  <span>{goal.timeAllocated} год/тиждень</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
