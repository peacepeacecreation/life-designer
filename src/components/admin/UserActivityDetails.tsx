'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, FileText, Lightbulb, Calendar, Workflow, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  type: 'goal' | 'note' | 'reflection' | 'calendar_event' | 'canvas' | 'time_entry';
  action: 'created' | 'updated';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Metrics {
  totalActiveDays: number;
  totalTimeTrackedHours: number;
  averageGoalsPerWeek: string;
  completionRate: string;
  lastActivityDate: string | null;
  daysSinceRegistration: number;
}

interface RecentItem {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  priority?: string;
  category?: string;
  note_type?: string;
  start_time?: string;
  created_at: string;
}

interface ActivityData {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  metrics: Metrics;
  activities: ActivityEvent[];
  recent: {
    goals: RecentItem[];
    notes: RecentItem[];
    events: RecentItem[];
  };
}

interface UserActivityDetailsProps {
  userId: string;
}

const activityTypeConfig = {
  goal: { icon: Target, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-950', label: 'Ціль' },
  note: { icon: FileText, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-950', label: 'Нотатка' },
  reflection: { icon: Lightbulb, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-950', label: 'Роздум' },
  calendar_event: { icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950', label: 'Подія' },
  canvas: { icon: Workflow, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-950', label: 'Canvas' },
  time_entry: { icon: Clock, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-950', label: 'Час' },
};

export default function UserActivityDetails({ userId }: UserActivityDetailsProps) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, [userId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${userId}/activity`);

      if (!response.ok) {
        throw new Error('Не вдалося завантажити активність користувача');
      }

      const activityData: ActivityData = await response.json();
      setData(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сьогодні';
    if (diffDays === 1) return 'Вчора';
    if (diffDays < 7) return `${diffDays} днів тому`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} тижнів тому`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} місяців тому`;
    return `${Math.floor(diffDays / 365)} років тому`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-red-600">
        {error || 'Не вдалося завантажити дані'}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-muted/30 rounded-lg">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Активні дні</CardDescription>
            <CardTitle className="text-2xl">{data.metrics.totalActiveDays}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Відстежено годин</CardDescription>
            <CardTitle className="text-2xl">{data.metrics.totalTimeTrackedHours}h</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Цілей/тиждень</CardDescription>
            <CardTitle className="text-2xl">{data.metrics.averageGoalsPerWeek}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">% Завершених</CardDescription>
            <CardTitle className="text-2xl">{data.metrics.completionRate}%</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Днів з реєстрації</CardDescription>
            <CardTitle className="text-2xl">{data.metrics.daysSinceRegistration}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Остання активність</CardDescription>
            <CardTitle className="text-sm">
              {data.metrics.lastActivityDate
                ? formatRelativeTime(data.metrics.lastActivityDate)
                : 'Немає'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Останні цілі
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent.goals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Немає цілей</p>
              ) : (
                data.recent.goals.map((goal) => (
                  <div key={goal.id} className="text-xs border-l-2 border-primary pl-2">
                    <div className="font-medium truncate">{goal.name}</div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs py-0">
                        {goal.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs py-0">
                        {goal.priority}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Останні нотатки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent.notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Немає нотаток</p>
              ) : (
                data.recent.notes.map((note) => (
                  <div key={note.id} className="text-xs border-l-2 border-purple-500 pl-2">
                    <div className="font-medium truncate">{note.title}</div>
                    <Badge variant="outline" className="text-xs py-0 mt-1">
                      {note.note_type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Останні події
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Немає подій</p>
              ) : (
                data.recent.events.map((event) => (
                  <div key={event.id} className="text-xs border-l-2 border-blue-500 pl-2">
                    <div className="font-medium truncate">{event.title}</div>
                    {event.start_time && (
                      <div className="text-muted-foreground mt-1">
                        {formatDate(event.start_time)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Timeline активності (останні 100 подій)
          </CardTitle>
          <CardDescription>
            Хронологія всіх дій користувача в системі
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Немає активності
              </p>
            ) : (
              data.activities.map((activity, index) => {
                const config = activityTypeConfig[activity.type];
                const Icon = config.icon;

                return (
                  <div
                    key={`${activity.id}-${index}`}
                    className="flex gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn('p-1.5 rounded-md h-fit', config.bgColor)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <Badge
                          variant={activity.action === 'created' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.action === 'created' ? 'Створено' : 'Оновлено'}
                        </Badge>
                      </div>
                      <div className="font-medium text-sm mt-1 truncate">
                        {activity.title}
                      </div>
                      {activity.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </div>
                      )}
                      {activity.metadata && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(activity.metadata)
                            .filter(([_, value]) => value !== null && value !== undefined)
                            .map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs py-0">
                                {String(value)}
                              </Badge>
                            ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(activity.timestamp)} • {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
