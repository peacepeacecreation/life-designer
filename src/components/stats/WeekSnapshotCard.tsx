'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface GoalProgress {
  id: string;
  name: string;
  color: string;
  timeAllocated: number;
  timeCompleted: number;
  timeScheduled: number;
  timeUnscheduled: number;
}

interface WeekSnapshot {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  totalAvailable: number;
  totalAllocated: number;
  totalCompleted: number;
  totalScheduled: number;
  freeTime: number;
  monthlyIncome: number;
  currency: string;
  goals: GoalProgress[];
}

interface WeekSnapshotCardProps {
  snapshot: WeekSnapshot;
}

export default function WeekSnapshotCard({ snapshot }: WeekSnapshotCardProps) {
  const completionRate = snapshot.totalAllocated > 0
    ? ((snapshot.totalCompleted / snapshot.totalAllocated) * 100).toFixed(1)
    : '0.0';

  const allocatedPercent = snapshot.totalAvailable > 0
    ? ((snapshot.totalAllocated / snapshot.totalAvailable) * 100).toFixed(1)
    : '0.0';

  const scheduledPercent = snapshot.totalAvailable > 0
    ? ((snapshot.totalScheduled / snapshot.totalAvailable) * 100).toFixed(1)
    : '0.0';

  const freePercent = snapshot.totalAvailable > 0
    ? ((snapshot.freeTime / snapshot.totalAvailable) * 100).toFixed(1)
    : '0.0';

  // Data for pie chart
  const chartData = [
    {
      name: 'Виконано',
      value: snapshot.totalCompleted,
      color: 'hsl(142, 76%, 36%)', // green
    },
    {
      name: 'Заброньовано',
      value: snapshot.totalScheduled,
      color: 'hsl(217, 91%, 60%)', // blue
    },
    {
      name: 'Не заплановано',
      value: snapshot.totalAllocated - snapshot.totalCompleted - snapshot.totalScheduled,
      color: 'hsl(var(--muted))',
    },
    {
      name: 'Вільно',
      value: snapshot.freeTime,
      color: 'hsl(var(--border))',
    },
  ].filter(item => item.value > 0);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{snapshot.weekLabel}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {snapshot.weekStart} - {snapshot.weekEnd}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: Stats + Goals List */}
          <div className="space-y-6">
            {/* Weekly Calculator Stats */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Тижневий калькулятор</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Фактично виконано / Заплановано</span>
                  <span className="font-semibold">
                    {snapshot.totalCompleted} / {snapshot.totalAllocated} год
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Виконано на цілі</span>
                  <span className="font-semibold text-green-600">
                    {snapshot.totalCompleted} год ({completionRate}%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Заброньовано на цілі</span>
                  <span className="font-semibold text-blue-600">
                    {snapshot.totalScheduled} год ({scheduledPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Goals Progress Bars */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Прогрес по цілях</h3>
              <div className="space-y-3">
                {snapshot.goals.map((goal) => {
                  const completed = goal.timeCompleted;
                  const scheduled = goal.timeScheduled;
                  const unscheduled = goal.timeUnscheduled;
                  const total = goal.timeAllocated;

                  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
                  const scheduledPercent = total > 0 ? (scheduled / total) * 100 : 0;
                  const unscheduledPercent = total > 0 ? (unscheduled / total) * 100 : 0;

                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {completed} / {total} год
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        {/* Completed */}
                        {completedPercent > 0 && (
                          <div
                            className="bg-green-500"
                            style={{ width: `${completedPercent}%` }}
                            title={`Виконано: ${completed} год`}
                          />
                        )}
                        {/* Scheduled */}
                        {scheduledPercent > 0 && (
                          <div
                            className="bg-blue-500"
                            style={{ width: `${scheduledPercent}%` }}
                            title={`Заброньовано: ${scheduled} год`}
                          />
                        )}
                        {/* Unscheduled */}
                        {unscheduledPercent > 0 && (
                          <div
                            className="bg-muted-foreground/30"
                            style={{ width: `${unscheduledPercent}%` }}
                            title={`Не заплановано: ${unscheduled} год`}
                          />
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          Вик: {completed}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          План: {scheduled}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                          Не запл: {unscheduled}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Pie Chart + Summary Stats */}
          <div className="space-y-4">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Доступно на тиждень:</span>
                <span className="font-semibold">{snapshot.totalAvailable} год</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Цілі:</span>
                <span className="font-semibold">
                  {snapshot.totalAllocated} год ({allocatedPercent}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Заплановані:</span>
                <span className="font-semibold">
                  {snapshot.totalScheduled} год ({scheduledPercent}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Вільно:</span>
                <span className="font-semibold">
                  {snapshot.freeTime} год ({freePercent}%)
                </span>
              </div>
              {snapshot.monthlyIncome > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Місячний дохід:</span>
                  <span className="font-semibold text-green-600">
                    {snapshot.monthlyIncome.toFixed(2)} {snapshot.currency}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
