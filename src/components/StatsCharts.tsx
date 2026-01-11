'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Реєстрація компонентів Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StatsCharts() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Визначення поточної теми
    const checkTheme = () => {
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(darkMode);
    };

    checkTheme();

    // Слухач для зміни теми
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Кольори для темної теми
  const darkColors = {
    primary: '#60a5fa',      // Яскравий блакитний
    secondary: '#a78bfa',    // Яскравий фіолетовий
    success: '#34d399',      // Яскравий зелений
    warning: '#fbbf24',      // Яскравий жовтий
    info: '#38bdf8',         // Яскравий cyan
    purple: '#c084fc',       // Яскравий пурпурний
    orange: '#fb923c',       // Яскравий помаранчевий
    foreground: '#f1f5f9',   // Світлий текст
    muted: '#94a3b8',        // Приглушений текст
    border: '#334155',       // Темна рамка
  };

  // Кольори для світлої теми
  const lightColors = {
    primary: '#3b82f6',      // Синій
    secondary: '#8b5cf6',    // Фіолетовий
    success: '#10b981',      // Зелений
    warning: '#f59e0b',      // Жовтий
    info: '#0ea5e9',         // Cyan
    purple: '#a855f7',       // Пурпурний
    orange: '#f97316',       // Помаранчевий
    foreground: '#0f172a',   // Темний текст
    muted: '#64748b',        // Приглушений текст
    border: '#e2e8f0',       // Світла рамка
  };

  const colors = isDark ? darkColors : lightColors;
  // Дані для лінійного графіка (прогрес за тиждень)
  const weeklyProgressData = {
    labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
    datasets: [
      {
        label: 'Виконані завдання',
        data: [12, 19, 15, 25, 22, 30, 28],
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}20`,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Заплановані завдання',
        data: [15, 20, 18, 28, 25, 32, 30],
        borderColor: colors.secondary,
        backgroundColor: `${colors.secondary}20`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Дані для bar графіка (категорії активностей)
  const categoriesData = {
    labels: ['Робота', 'Спорт', 'Навчання', 'Хобі', 'Сім\'я'],
    datasets: [
      {
        label: 'Години цього тижня',
        data: [40, 5, 10, 8, 15],
        backgroundColor: [
          `${colors.primary}CC`,
          `${colors.info}CC`,
          `${colors.success}CC`,
          `${colors.warning}CC`,
          `${colors.purple}CC`,
        ],
        borderColor: [
          colors.primary,
          colors.info,
          colors.success,
          colors.warning,
          colors.purple,
        ],
        borderWidth: 2,
      },
    ],
  };

  // Дані для doughnut графіка (досягнення цілей)
  const goalsData = {
    labels: ['Завершено', 'В процесі', 'Не почато'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: [
          `${colors.success}CC`,
          `${colors.primary}CC`,
          `${colors.muted}80`,
        ],
        borderColor: [
          colors.success,
          colors.primary,
          colors.muted,
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: colors.foreground,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: colors.foreground,
        bodyColor: colors.foreground,
        borderColor: colors.border,
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        ticks: {
          color: colors.muted,
        },
        grid: {
          color: `${colors.border}80`,
        },
      },
      x: {
        ticks: {
          color: colors.muted,
        },
        grid: {
          color: `${colors.border}80`,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: colors.foreground,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: colors.foreground,
        bodyColor: colors.foreground,
        borderColor: colors.border,
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Лінійний графік прогресу */}
      <div className="p-6 border border-border rounded-lg bg-card">
        <h2 className="text-xl font-semibold mb-4">Тижневий прогрес</h2>
        <div className="h-64">
          <Line data={weeklyProgressData} options={chartOptions} />
        </div>
      </div>

      {/* Bar графік категорій */}
      <div className="p-6 border border-border rounded-lg bg-card">
        <h2 className="text-xl font-semibold mb-4">Розподіл часу по категоріях</h2>
        <div className="h-64">
          <Bar data={categoriesData} options={chartOptions} />
        </div>
      </div>

      {/* Doughnut графік цілей */}
      <div className="p-6 border border-border rounded-lg bg-card">
        <h2 className="text-xl font-semibold mb-4">Статус цілей</h2>
        <div className="h-64 flex items-center justify-center">
          <Doughnut data={goalsData} options={doughnutOptions} />
        </div>
      </div>

      {/* Статистичні картки */}
      <div className="space-y-4">
        <div className="p-6 border border-border rounded-lg bg-card">
          <h3 className="text-sm text-muted-foreground mb-2">Всього завдань</h3>
          <p className="text-3xl font-bold">156</p>
          <p className="text-sm mt-1" style={{ color: colors.success }}>
            +12% від минулого тижня
          </p>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h3 className="text-sm text-muted-foreground mb-2">Час продуктивності</h3>
          <p className="text-3xl font-bold">78 год</p>
          <p className="text-sm mt-1" style={{ color: colors.success }}>
            +5% від минулого тижня
          </p>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h3 className="text-sm text-muted-foreground mb-2">Досягнуті цілі</h3>
          <p className="text-3xl font-bold">23/35</p>
          <p className="text-sm mt-1" style={{ color: colors.warning }}>
            65.7% виконано
          </p>
        </div>
      </div>
    </div>
  );
}
