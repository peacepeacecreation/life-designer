'use client';

import { Goal, GoalCategory } from '@/types';
import { getCategoryMeta, priorityLabels, statusLabels } from '@/lib/categoryConfig';
import { useGoals } from '@/contexts/GoalsContext';
import { useConfirm } from '@/hooks/use-confirm';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Briefcase, BookOpen, Dumbbell, Palette, Trash2, Calendar, ExternalLink, DollarSign, GripVertical } from 'lucide-react';
import Link from 'next/link';
import GoalTimeProgress from './GoalTimeProgress';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getIconById, isPredefinedIcon } from '@/lib/goalIcons';

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
  const confirm = useConfirm();
  const categoryMeta = getCategoryMeta(goal.category);
  const goalColor = goal.color || categoryMeta.color;

  // Determine which icon to display
  let IconToDisplay: React.ElementType | null = null;
  let isCustomImage = false;

  if (goal.iconUrl) {
    if (isPredefinedIcon(goal.iconUrl)) {
      // It's a predefined icon ID
      const iconOption = getIconById(goal.iconUrl);
      if (iconOption) {
        IconToDisplay = iconOption.Icon;
      }
    } else {
      // It's a custom uploaded image URL
      isCustomImage = true;
    }
  }

  // Fallback to category icon if no icon selected
  if (!IconToDisplay && !isCustomImage) {
    IconToDisplay = categoryIcons[goal.category];
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Видалити ціль?',
      description: `Ви впевнені, що хочете видалити ціль "${goal.name}"?`,
      variant: 'destructive',
    });

    if (confirmed) {
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
    ongoing: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-card hover:shadow-lg transition-shadow relative group"
    >
      <Link href={`/goal/${goal.id}`} className="block">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg flex items-center justify-center">
                {isCustomImage ? (
                  <img
                    src={goal.iconUrl}
                    alt={goal.name}
                    className="h-10 w-10 object-contain rounded-lg"
                  />
                ) : IconToDisplay ? (
                  <IconToDisplay className="h-10 w-10 p-2" style={{ color: goalColor }} />
                ) : null}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-black dark:text-white">{goal.name}</h3>
                  {goal.url && (
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(goal.url, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title={goal.url}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{categoryMeta.name}</p>
              </div>
            </div>

            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.preventDefault()}
              className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-2"
              aria-label="Перетягнути ціль"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          </div>
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
          <div className="space-y-2">
            {/* Goal Time Progress */}
            <GoalTimeProgress goal={goal} />

            {goal.currency && goal.paymentType && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Заробіток:</span>
                </div>
                {goal.paymentType === 'hourly' && goal.hourlyRate ? (
                  <span className="font-semibold text-black dark:text-white">
                    {goal.hourlyRate} {goal.currency}/год
                    <span className="text-xs text-muted-foreground ml-1">
                      (~{(goal.hourlyRate * goal.timeAllocated * 4).toFixed(0)} {goal.currency}/міс)
                    </span>
                  </span>
                ) : goal.paymentType === 'fixed' && goal.fixedRate ? (
                  <span className="font-semibold text-black dark:text-white">
                    {goal.fixedRate} {goal.currency}/{goal.fixedRatePeriod === 'week' ? 'тиж' : 'міс'}
                    {goal.fixedRatePeriod === 'week' && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (~{(goal.fixedRate * 4).toFixed(0)} {goal.currency}/міс)
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            )}

            {goal.progressPercentage > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Прогрес:</span>
                  <span className="font-semibold text-black dark:text-white">{goal.progressPercentage}%</span>
                </div>
                <Progress value={goal.progressPercentage} />
              </div>
            )}

            {!goal.isOngoing && goal.targetEndDate && (
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
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
