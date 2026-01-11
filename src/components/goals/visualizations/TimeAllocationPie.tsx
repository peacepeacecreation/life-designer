'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { useGoals } from '@/contexts/GoalsContext';
import { GoalCategory } from '@/types';
import { categoryMeta } from '@/lib/categoryConfig';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TimeAllocationPie() {
  const { goals, getTotalTimeAllocated, getOvercommitmentRisk } = useGoals();

  const chartData = useMemo(() => {
    // Calculate time allocation by category
    const timeByCategory: Record<GoalCategory, number> = {
      [GoalCategory.WORK_STARTUPS]: 0,
      [GoalCategory.LEARNING]: 0,
      [GoalCategory.HEALTH_SPORTS]: 0,
      [GoalCategory.HOBBIES]: 0,
    };

    goals.forEach(goal => {
      timeByCategory[goal.category] += goal.timeAllocated;
    });

    // Filter out categories with 0 time and prepare data
    const categories = categoryMeta.filter(cat => timeByCategory[cat.id] > 0);
    const data = categories.map(cat => timeByCategory[cat.id]);
    const labels = categories.map(cat => cat.name);

    // Extract colors (remove hsl() wrapper for Chart.js)
    const backgroundColor = categories.map(cat => {
      // Map category colors to actual HSL values
      const colorMap: Record<GoalCategory, string> = {
        [GoalCategory.WORK_STARTUPS]: 'hsl(0, 84%, 60%)',
        [GoalCategory.LEARNING]: 'hsl(221, 83%, 53%)',
        [GoalCategory.HEALTH_SPORTS]: 'hsl(142, 71%, 45%)',
        [GoalCategory.HOBBIES]: 'hsl(280, 65%, 60%)',
      };
      return colorMap[cat.id];
    });

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: backgroundColor.map(color => color.replace('60%)', '70%)')),
          borderWidth: 2,
        },
      ],
    };
  }, [goals]);

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'hsl(var(--foreground))',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} год (${percentage}%)`;
          },
        },
      },
    },
  };

  const totalHours = getTotalTimeAllocated();
  const risk = getOvercommitmentRisk();

  const getRiskColor = () => {
    if (risk === 0) return 'text-green-600 dark:text-green-400';
    if (risk < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-destructive';
  };

  const getRiskMessage = () => {
    if (risk === 0) return 'Оптимальне навантаження';
    if (risk < 50) return 'Помірне навантаження';
    return 'Критичне перевантаження';
  };

  if (goals.length === 0) {
    return (
      <Card className="bg-white dark:bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-black dark:text-white">Розподіл часу</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Додайте цілі щоб побачити розподіл часу
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-black dark:text-white">Розподіл часу</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Всього годин:</span>
            <span className="text-2xl font-bold text-black dark:text-white">{totalHours}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Статус:</span>
            </div>
            <span className={`text-sm font-semibold ${getRiskColor()}`}>
              {getRiskMessage()}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            З 168 доступних годин на тиждень
          </div>
        </div>

        {/* Chart */}
        <div className="w-full aspect-square max-w-sm mx-auto">
          <Doughnut data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
