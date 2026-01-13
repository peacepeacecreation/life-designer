'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useGoals } from '@/contexts/GoalsContext';
import { useTimeCalculator } from '@/contexts/TimeCalculatorContext';
import { GoalCategory, GoalStatus, GoalPriority } from '@/types';
import { categoryMeta, statusLabels, priorityLabels } from '@/lib/categoryConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalProgressList } from '@/components/stats/GoalProgressList';
import { FinancialStats } from '@/components/stats/FinancialStats';
import { FutureProfile } from '@/components/stats/FutureProfile';
import { WeekSelector } from '@/components/stats/WeekSelector';
import { WeekHistoryCard } from '@/components/stats/WeekHistoryCard';

// Реєстрація компонентів Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Пастельні кольори з календаря
const PASTEL_COLORS = {
  red: '#fca5a5',
  blue: '#93c5fd',
  green: '#6ee7b7',
  purple: '#c4b5fd',
  yellow: '#fcd34d',
  pink: '#f9a8d4',
};

export default function StatsCharts() {
  const [isDark, setIsDark] = useState(false);
  const { goals, loading } = useGoals();
  const { timeAllocation } = useTimeCalculator();
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<GoalPriority | 'all'>('all');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  useEffect(() => {
    const checkTheme = () => {
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(darkMode);
    };

    checkTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Текстові кольори для теми
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  // Розрахунок місячного доходу
  const totalMonthlyIncome = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};

    goals.forEach(goal => {
      if (!goal.currency) return;

      let monthlyAmount = 0;

      if (goal.paymentType === 'hourly' && goal.hourlyRate && goal.hourlyRate > 0) {
        monthlyAmount = goal.hourlyRate * goal.timeAllocated * 4;
      } else if (goal.paymentType === 'fixed' && goal.fixedRate && goal.fixedRate > 0) {
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

    const entries = Object.entries(incomeByCategory);
    if (entries.length === 0) return null;

    const primary = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );

    return {
      amount: primary[1],
      currency: primary[0],
      hasMultipleCurrencies: entries.length > 1,
    };
  }, [goals]);

  // Дані для Doughnut графіка (розподіл часу по категоріях)
  const categoriesData = useMemo(() => {
    const timeByCategory: Record<GoalCategory, number> = {
      [GoalCategory.WORK_STARTUPS]: 0,
      [GoalCategory.LEARNING]: 0,
      [GoalCategory.HEALTH_SPORTS]: 0,
      [GoalCategory.HOBBIES]: 0,
    };

    goals.forEach(goal => {
      timeByCategory[goal.category] += goal.timeAllocated;
    });

    const categories = categoryMeta.filter(cat => timeByCategory[cat.id] > 0);
    const data = categories.map(cat => timeByCategory[cat.id]);
    const labels = categories.map(cat => cat.name);

    const categoryColors = {
      [GoalCategory.WORK_STARTUPS]: PASTEL_COLORS.red,
      [GoalCategory.LEARNING]: PASTEL_COLORS.blue,
      [GoalCategory.HEALTH_SPORTS]: PASTEL_COLORS.green,
      [GoalCategory.HOBBIES]: PASTEL_COLORS.purple,
    };

    const backgroundColor = categories.map(cat => categoryColors[cat.id]);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 0,
        },
      ],
    };
  }, [goals]);

  // Дані для Bar графіка (статус цілей)
  const statusData = useMemo(() => {
    const statusCounts: Record<GoalStatus, number> = {
      not_started: 0,
      in_progress: 0,
      on_hold: 0,
      completed: 0,
      abandoned: 0,
      ongoing: 0,
    };

    goals.forEach(goal => {
      statusCounts[goal.status]++;
    });

    const filteredStatuses = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status]) => status as GoalStatus);

    const labels = filteredStatuses.map(status => statusLabels[status]);
    const data = filteredStatuses.map(status => statusCounts[status]);

    const statusColors: Record<GoalStatus, string> = {
      not_started: PASTEL_COLORS.pink,
      in_progress: PASTEL_COLORS.blue,
      on_hold: PASTEL_COLORS.yellow,
      completed: PASTEL_COLORS.green,
      abandoned: mutedColor,
      ongoing: PASTEL_COLORS.purple,
    };

    const backgroundColor = filteredStatuses.map(status => statusColors[status]);

    return {
      labels,
      datasets: [
        {
          label: 'Кількість цілей',
          data,
          backgroundColor,
          borderWidth: 0,
          borderRadius: 8,
        },
      ],
    };
  }, [goals, mutedColor]);

  // Відфільтровані цілі для табів
  const filteredGoalsByCategory = useMemo(() => {
    if (selectedCategory === 'all') return goals;
    return goals.filter(g => g.category === selectedCategory);
  }, [goals, selectedCategory]);

  const filteredGoalsByPriority = useMemo(() => {
    if (selectedPriority === 'all') return goals;
    return goals.filter(g => g.priority === selectedPriority);
  }, [goals, selectedPriority]);

  // Статистика для фільтрованих цілей
  const categoryStats = useMemo(() => {
    const filtered = filteredGoalsByCategory;
    const totalHours = filtered.reduce((sum, g) => sum + g.timeAllocated, 0);
    const avgProgress = 0; // Progress percentage removed

    return {
      count: filtered.length,
      totalHours,
      avgProgress,
    };
  }, [filteredGoalsByCategory]);

  const priorityStats = useMemo(() => {
    const filtered = filteredGoalsByPriority;
    const totalHours = filtered.reduce((sum, g) => sum + g.timeAllocated, 0);
    const avgProgress = 0; // Progress percentage removed

    return {
      count: filtered.length,
      totalHours,
      avgProgress,
    };
  }, [filteredGoalsByPriority]);

  const completedGoals = useMemo(() => goals.filter(g => g.status === GoalStatus.COMPLETED).length, [goals]);
  const totalGoals = goals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: mutedColor,
        borderWidth: 1,
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: mutedColor,
          stepSize: 1,
        },
        grid: {
          color: isDark ? '#334155' : '#e2e8f0',
        },
      },
      x: {
        ticks: {
          color: mutedColor,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-8">
        <TabsTrigger value="overview">Огляд</TabsTrigger>
        <TabsTrigger value="history">Історія</TabsTrigger>
        <TabsTrigger value="finances">Фінанси</TabsTrigger>
        <TabsTrigger value="future">Майбутнє</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
        <TabsTrigger value="priorities">Пріоритети</TabsTrigger>
        <TabsTrigger value="progress">Прогрес</TabsTrigger>
      </TabsList>

      {/* Таб: Огляд */}
      <TabsContent value="overview" className="space-y-8">
        {/* KPI Картки */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Всього цілей</h3>
            <p className="text-3xl font-bold">{totalGoals}</p>
            <p className="text-sm mt-1 text-muted-foreground">
              Активних цілей у системі
            </p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Час на тиждень</h3>
            <p className="text-3xl font-bold">
              {Math.round(timeAllocation.goalsHours)} год
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              З {Math.round(timeAllocation.totalAvailableHours)} доступних годин
            </p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Завершені цілі</h3>
            <p className="text-3xl font-bold">{completedGoals}/{totalGoals}</p>
            <p className="text-sm mt-1" style={{ color: completionRate >= 50 ? PASTEL_COLORS.green : PASTEL_COLORS.yellow }}>
              {completionRate.toFixed(1)}% виконано
            </p>
          </Card>

          {totalMonthlyIncome && (
            <Card className="p-6 bg-white dark:bg-card">
              <h3 className="text-sm text-muted-foreground mb-2">Місячний дохід</h3>
              <p className="text-3xl font-bold">
                {totalMonthlyIncome.amount.toFixed(0)} {totalMonthlyIncome.currency}
              </p>
              {totalMonthlyIncome.hasMultipleCurrencies && (
                <p className="text-sm mt-1 text-muted-foreground">
                  * основна валюта
                </p>
              )}
            </Card>
          )}
        </div>

        {/* Графіки */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 bg-white dark:bg-card">
            <h2 className="text-xl font-semibold mb-4">Розподіл часу по категоріях</h2>
            <div className="h-64 flex items-center justify-center">
              {goals.length > 0 ? (
                <Doughnut data={categoriesData} options={chartOptions} />
              ) : (
                <div className="text-muted-foreground">
                  Немає даних для відображення
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h2 className="text-xl font-semibold mb-4">Статус цілей</h2>
            <div className="h-64">
              {goals.length > 0 ? (
                <Bar data={statusData} options={barChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Немає даних для відображення
                </div>
              )}
            </div>
          </Card>
        </div>
      </TabsContent>

      {/* Таб: Історія */}
      <TabsContent value="history" className="space-y-6">
        <WeekSelector
          selectedWeekOffset={selectedWeekOffset}
          onWeekChange={setSelectedWeekOffset}
          weeksToShow={12}
        />
        <WeekHistoryCard weekOffset={selectedWeekOffset} goals={goals} />
      </TabsContent>

      {/* Таб: Фінанси */}
      <TabsContent value="finances" className="space-y-6">
        <FinancialStats goals={goals} />
      </TabsContent>

      {/* Таб: Майбутнє */}
      <TabsContent value="future" className="space-y-6">
        <FutureProfile goals={goals} />
      </TabsContent>

      {/* Таб: По категоріях */}
      <TabsContent value="categories" className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Категорія:</label>
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as GoalCategory | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі категорії</SelectItem>
              {categoryMeta.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Міні-статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Кількість цілей</h3>
            <p className="text-3xl font-bold">{categoryStats.count}</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Всього годин</h3>
            <p className="text-3xl font-bold">{categoryStats.totalHours} год</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Середній прогрес</h3>
            <p className="text-3xl font-bold">{categoryStats.avgProgress.toFixed(1)}%</p>
          </Card>
        </div>

        <GoalProgressList goals={filteredGoalsByCategory} />
      </TabsContent>

      {/* Таб: По пріоритетах */}
      <TabsContent value="priorities" className="space-y-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Пріоритет:</label>
          <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as GoalPriority | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі пріоритети</SelectItem>
              <SelectItem value="critical">{priorityLabels.critical}</SelectItem>
              <SelectItem value="high">{priorityLabels.high}</SelectItem>
              <SelectItem value="medium">{priorityLabels.medium}</SelectItem>
              <SelectItem value="low">{priorityLabels.low}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Міні-статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Кількість цілей</h3>
            <p className="text-3xl font-bold">{priorityStats.count}</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Всього годин</h3>
            <p className="text-3xl font-bold">{priorityStats.totalHours} год</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-card">
            <h3 className="text-sm text-muted-foreground mb-2">Середній прогрес</h3>
            <p className="text-3xl font-bold">{priorityStats.avgProgress.toFixed(1)}%</p>
          </Card>
        </div>

        <GoalProgressList goals={filteredGoalsByPriority} />
      </TabsContent>

      {/* Таб: Прогрес */}
      <TabsContent value="progress" className="space-y-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Прогрес всіх цілей</h2>
          <p className="text-sm text-muted-foreground">Відсортовано за прогресом (найбільший зверху)</p>
        </div>

        <GoalProgressList goals={goals} />
      </TabsContent>
    </Tabs>
  );
}
