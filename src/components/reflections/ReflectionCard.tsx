'use client';

import { Reflection, ReflectionType } from '@/types/reflections';
import { useReflections } from '@/contexts/ReflectionsContext';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Lightbulb,
  Trash2,
  Smile,
  Zap,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from 'lucide-react';

interface ReflectionCardProps {
  reflection: Reflection;
  onEdit?: (reflection: Reflection) => void;
}

const reflectionTypeIcons: Record<ReflectionType, React.ElementType> = {
  [ReflectionType.DAILY]: Calendar,
  [ReflectionType.WEEKLY]: CalendarDays,
  [ReflectionType.MONTHLY]: CalendarRange,
  [ReflectionType.QUARTERLY]: CalendarClock,
  [ReflectionType.YEARLY]: CalendarRange,
  [ReflectionType.CUSTOM]: Lightbulb,
};

const reflectionTypeLabels: Record<ReflectionType, string> = {
  [ReflectionType.DAILY]: 'Щоденний',
  [ReflectionType.WEEKLY]: 'Тижневий',
  [ReflectionType.MONTHLY]: 'Місячний',
  [ReflectionType.QUARTERLY]: 'Квартальний',
  [ReflectionType.YEARLY]: 'Річний',
  [ReflectionType.CUSTOM]: 'Довільний',
};

const reflectionTypeColors: Record<ReflectionType, string> = {
  [ReflectionType.DAILY]: 'hsl(200, 70%, 50%)',
  [ReflectionType.WEEKLY]: 'hsl(160, 60%, 45%)',
  [ReflectionType.MONTHLY]: 'hsl(280, 60%, 50%)',
  [ReflectionType.QUARTERLY]: 'hsl(320, 60%, 50%)',
  [ReflectionType.YEARLY]: 'hsl(30, 70%, 50%)',
  [ReflectionType.CUSTOM]: 'hsl(45, 90%, 50%)',
};

// Mood emoji helper
const getMoodEmoji = (score: number): string => {
  if (score >= 9) return '😄';
  if (score >= 7) return '🙂';
  if (score >= 5) return '😐';
  if (score >= 3) return '😟';
  return '😢';
};

// Energy color helper
const getEnergyColor = (level: number): string => {
  if (level >= 8) return 'text-green-600 dark:text-green-400';
  if (level >= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
};

export default function ReflectionCard({ reflection, onEdit }: ReflectionCardProps) {
  const { deleteReflection } = useReflections();
  const ReflectionIcon = reflectionTypeIcons[reflection.reflectionType];
  const typeColor = reflectionTypeColors[reflection.reflectionType];

  const handleDelete = async () => {
    if (confirm(`Ви впевнені, що хочете видалити роздум "${reflection.title}"?`)) {
      await deleteReflection(reflection.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onEdit) {
      onEdit(reflection);
    }
  };

  return (
    <Card className="bg-white dark:bg-card hover:shadow-lg transition-shadow relative group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${typeColor}/0.1` }}>
              <ReflectionIcon className="h-5 w-5" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-black dark:text-white truncate">
                {reflection.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(reflection.reflectionDate).toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={handleEdit}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {reflection.content && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
            {reflection.content}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Type Badge */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {reflectionTypeLabels[reflection.reflectionType]}
            </Badge>
            {reflection.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Mood and Energy */}
          {(reflection.moodScore !== undefined || reflection.energyLevel !== undefined) && (
            <div className="flex items-center gap-4 text-sm">
              {reflection.moodScore !== undefined && (
                <div className="flex items-center gap-2">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Настрій:</span>
                  <span className="font-semibold text-black dark:text-white">
                    {getMoodEmoji(reflection.moodScore)} {reflection.moodScore}/10
                  </span>
                </div>
              )}
              {reflection.energyLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Енергія:</span>
                  <span className={`font-semibold ${getEnergyColor(reflection.energyLevel)}`}>
                    {reflection.energyLevel}/10
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
