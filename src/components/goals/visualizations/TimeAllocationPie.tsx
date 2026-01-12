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
import { useTimeCalculator } from '@/contexts/TimeCalculatorContext';
import { GoalCategory } from '@/types';
import { categoryMeta } from '@/lib/categoryConfig';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TimeAllocationPie() {
  const { goals, loading } = useGoals();
  const { timeAllocation, isOptimal, isNearCapacity, isOverloaded } = useTimeCalculator();

  // Розрахунок місячного доходу (загальний)
  const totalMonthlyIncome = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};

    goals.forEach(goal => {
      if (!goal.currency) return;

      let monthlyAmount = 0;

      if (goal.paymentType === 'hourly' && goal.hourlyRate && goal.hourlyRate > 0) {
        // Погодинна оплата: ставка * години на тиждень * 4 тижні
        monthlyAmount = goal.hourlyRate * goal.timeAllocated * 4;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate && goal.fixedRate > 0) {
        // Фіксована ставка: конвертуємо в місячну
        if (goal.fixedRatePeriod === 'week') {
          monthlyAmount = goal.fixedRate * 4;
        } else if (goal.fixedRatePeriod === 'month') {
          monthlyAmount = goal.fixedRate;
        }
      }

      if (monthlyAmount > 0) {
        if (!incomeByCategory[goal.currency]) {
          incomeByCategory[goal.currency] = 0;
        }
        incomeByCategory[goal.currency] += monthlyAmount;
      }
    });

    // Знаходимо найбільшу суму
    const entries = Object.entries(incomeByCategory);
    if (entries.length === 0) return null;

    // Якщо всі у одній валюті або знаходимо найбільшу
    const primary = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );

    return {
      amount: primary[1],
      currency: primary[0],
      hasMultipleCurrencies: entries.length > 1,
    };
  }, [goals]);

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

    // Додаємо заплановані події з календаря
    if (timeAllocation.scheduledHours > 0) {
      labels.push('Заплановані');
      data.push(Math.round(timeAllocation.scheduledHours * 10) / 10);
      backgroundColor.push('hsl(200, 70%, 65%)'); // Голубий
    }

    // Додаємо вільний час
    if (timeAllocation.freeHours > 0) {
      labels.push('Вільний час');
      data.push(Math.round(timeAllocation.freeHours * 10) / 10);
      backgroundColor.push('hsl(142, 60%, 70%)'); // Світло-зелений
    }

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
  }, [goals, timeAllocation]);

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

  const getRiskColor = () => {
    if (isOptimal) return 'text-green-600 dark:text-green-400';
    if (isNearCapacity) return 'text-yellow-600 dark:text-yellow-400';
    if (isOverloaded) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getRiskMessage = () => {
    if (isOptimal) return 'Оптимальне навантаження';
    if (isNearCapacity) return 'Помірне навантаження';
    if (isOverloaded) return 'Критичне перевантаження';
    return 'Невідомо';
  };

  if (loading) {
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
            Завантаження...
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <span className="text-sm text-muted-foreground">Доступно на тиждень:</span>
            <span className="text-2xl font-bold text-black dark:text-white">
              {Math.round(timeAllocation.totalAvailableHours)} год
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Цілі:</span>
              </div>
              <span className="font-medium text-black dark:text-white">
                {Math.round(timeAllocation.goalsHours * 10) / 10} год
                <span className="text-xs text-muted-foreground ml-1">
                  ({((timeAllocation.goalsHours / timeAllocation.totalAvailableHours) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Заплановані:</span>
              </div>
              <span className="font-medium text-black dark:text-white">
                {Math.round(timeAllocation.scheduledHours * 10) / 10} год
                <span className="text-xs text-muted-foreground ml-1">
                  ({((timeAllocation.scheduledHours / timeAllocation.totalAvailableHours) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Вільно:</span>
              </div>
              <span className="font-medium text-black dark:text-white">
                {Math.round(timeAllocation.freeHours * 10) / 10} год
                <span className="text-xs text-muted-foreground ml-1">
                  ({((timeAllocation.freeHours / timeAllocation.totalAvailableHours) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>

          {totalMonthlyIncome && (
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Місячний дохід:</span>
                </div>
                <span className="font-medium text-black dark:text-white">
                  {totalMonthlyIncome.amount.toFixed(2)} {totalMonthlyIncome.currency}
                  {totalMonthlyIncome.hasMultipleCurrencies && (
                    <span className="text-xs ml-1">*</span>
                  )}
                </span>
              </div>
              {totalMonthlyIncome.hasMultipleCurrencies && (
                <p className="text-xs text-muted-foreground mt-1 pl-6">
                  * основна валюта
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Статус:</span>
            </div>
            <span className={`text-sm font-semibold ${getRiskColor()}`}>
              {getRiskMessage()}
            </span>
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
