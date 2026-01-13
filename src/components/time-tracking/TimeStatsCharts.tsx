'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Clock, TrendingUp, Target, Calendar, AlertCircle } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { uk } from 'date-fns/locale';

interface TimeByGoalStats {
  goalId: string;
  goalName: string;
  goalCategory: string;
  goalIconUrl?: string;
  totalSeconds: number;
  totalHours: number;
  entryCount: number;
}

interface StatsSummary {
  totalSeconds: number;
  totalHours: number;
  totalEntries: number;
  startDate: string;
  endDate: string;
  periodDays: number;
}

interface ByDay {
  date: string;
  totalSeconds: number;
  totalHours: number;
}

interface ByWeek {
  weekStart: string;
  totalSeconds: number;
  totalHours: number;
}

interface StatsResponse {
  stats: {
    summary: StatsSummary;
    byGoal: TimeByGoalStats[];
    byDay?: ByDay[];
    byWeek?: ByWeek[];
    bySource: {
      manual: { seconds: number; hours: number };
      clockify: { seconds: number; hours: number };
      calendarEvent: { seconds: number; hours: number };
    };
  };
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function TimeStatsCharts() {
  const [stats, setStats] = useState<StatsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'goal' | 'day' | 'week'>('goal');

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = subDays(end, 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Fetch stats when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchStats();
    }
  }, [startDate, endDate, groupBy]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
      });

      const response = await fetch(`/api/time-entries/stats?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data: StatsResponse = await response.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRange = (range: 'week' | 'month' | '3months') => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case 'week':
        start = startOfWeek(end, { locale: uk });
        break;
      case 'month':
        start = startOfMonth(end);
        break;
      case '3months':
        start = subDays(end, 90);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Помилка завантаження: {error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Період
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Початкова дата</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Кінцева дата</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Групувати</Label>
              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goal">По цілях</SelectItem>
                  <SelectItem value="day">По днях</SelectItem>
                  <SelectItem value="week">По тижнях</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => handleQuickRange('week')}>
              Цей тиждень
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange('month')}>
              Цей місяць
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange('3months')}>
              3 місяці
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Всього годин</p>
                    <p className="text-3xl font-bold">{stats.summary.totalHours.toFixed(1)}</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Записів</p>
                    <p className="text-3xl font-bold">{stats.summary.totalEntries}</p>
                  </div>
                  <Target className="h-10 w-10 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Днів</p>
                    <p className="text-3xl font-bold">{stats.summary.periodDays}</p>
                  </div>
                  <Calendar className="h-10 w-10 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Середньо/день</p>
                    <p className="text-3xl font-bold">
                      {(stats.summary.totalHours / (stats.summary.periodDays || 1)).toFixed(1)}
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-amber-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart - Time by Goal */}
          {stats.byGoal.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Розподіл часу по цілях</CardTitle>
                <CardDescription>
                  Відсоткове співвідношення часу, витраченого на кожну ціль
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={stats.byGoal as any}
                      dataKey="totalHours"
                      nameKey="goalName"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(entry: any) => `${entry.goalName}: ${entry.totalHours.toFixed(1)}год`}
                    >
                      {stats.byGoal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${value.toFixed(1)} годин`}
                      labelStyle={{ color: '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Goal Stats Table */}
                <div className="mt-6 space-y-2">
                  {stats.byGoal.map((goal, index) => (
                    <div
                      key={goal.goalId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {goal.goalIconUrl && (
                          <img src={goal.goalIconUrl} alt="" className="w-5 h-5" />
                        )}
                        <div>
                          <p className="font-medium">{goal.goalName}</p>
                          <p className="text-xs text-muted-foreground">{goal.goalCategory}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{goal.totalHours.toFixed(1)} год</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.entryCount} записів
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bar Chart - Time by Week/Day */}
          {(stats.byWeek || stats.byDay) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {groupBy === 'week' ? 'Час по тижнях' : 'Час по днях'}
                </CardTitle>
                <CardDescription>
                  Динаміка відстеження часу за обраний період
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.byWeek || stats.byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={groupBy === 'week' ? 'weekStart' : 'date'}
                      tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: uk })}
                    />
                    <YAxis
                      label={{ value: 'Години', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value: any) => `${value.toFixed(1)} годин`}
                      labelFormatter={(label) =>
                        format(new Date(label), 'dd MMMM yyyy', { locale: uk })
                      }
                    />
                    <Bar dataKey="totalHours" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Source Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Розподіл по джерелах</CardTitle>
              <CardDescription>Звідки надходять записи часу</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <p className="text-sm text-muted-foreground mb-1">Clockify</p>
                  <p className="text-2xl font-bold">{stats.bySource.clockify.hours.toFixed(1)} год</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-sm text-muted-foreground mb-1">Календар</p>
                  <p className="text-2xl font-bold">{stats.bySource.calendarEvent.hours.toFixed(1)} год</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950">
                  <p className="text-sm text-muted-foreground mb-1">Вручну</p>
                  <p className="text-2xl font-bold">{stats.bySource.manual.hours.toFixed(1)} год</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Виберіть період для перегляду статистики</p>
        </div>
      )}
    </div>
  );
}
