'use client';

import { Goal, GoalCategory } from '@/types';
import { getCategoryMeta, priorityLabels, statusLabels } from '@/lib/categoryConfig';
import { useGoals } from '@/contexts/GoalsContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Briefcase, BookOpen, Dumbbell, Palette, Trash2, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

interface GoalCardProps {
  goal: Goal;
}

const categoryIcons: Record<GoalCategory, React.ElementType> = {
  [GoalCategory.WORK_STARTUPS]: Briefcase,
  [GoalCategory.LEARNING]: BookOpen,
  [GoalCategory.HEALTH_SPORTS]: Dumbbell,
  [GoalCategory.HOBBIES]: Palette,
};

export default function GoalCard({ goal }: GoalCardProps) {
  const { deleteGoal } = useGoals();
  const categoryMeta = getCategoryMeta(goal.category);
  const CategoryIcon = categoryIcons[goal.category];

  const handleDelete = () => {
    if (confirm(`Ви впевнені, що хочете видалити ціль "${goal.name}"?`)) {
      deleteGoal(goal.id);
    }
  };

  const priorityVariants = {
    critical: 'destructive' as const,
    high: 'default' as const,
    medium: 'secondary' as const,
    low: 'outline' as const,
  };

  const statusColors = {
    not_started: 'text-muted-foreground',
    in_progress: 'text-blue-600 dark:text-blue-400',
    on_hold: 'text-yellow-600 dark:text-yellow-400',
    completed: 'text-green-600 dark:text-green-400',
    abandoned: 'text-muted-foreground line-through',
  };

  return (
    <Card className="bg-white dark:bg-card hover:shadow-lg transition-shadow relative group">
      <Link href={`/goal/${goal.id}`} className="block">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${categoryMeta.color}/0.1` }}>
                <CategoryIcon className="h-5 w-5" style={{ color: categoryMeta.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-black dark:text-white">{goal.name}</h3>
                <p className="text-sm text-muted-foreground">{categoryMeta.name}</p>
              </div>
            </div>

            <Button
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive z-10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {goal.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {goal.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={priorityVariants[goal.priority]}>
              {priorityLabels[goal.priority]}
            </Badge>
            <Badge variant="outline" className={statusColors[goal.status]}>
              {statusLabels[goal.status]}
            </Badge>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Час на тиждень:</span>
              </div>
              <span className="font-semibold text-black dark:text-white">{goal.timeAllocated} год</span>
            </div>

            {goal.progressPercentage > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Прогрес:</span>
                  <span className="font-semibold text-black dark:text-white">{goal.progressPercentage}%</span>
                </div>
                <Progress value={goal.progressPercentage} />
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Завершення:</span>
              </div>
              <span className="font-semibold text-black dark:text-white">
                {new Date(goal.targetEndDate).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
