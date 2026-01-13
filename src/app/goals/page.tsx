'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import GoalsList from '@/components/goals/GoalsList';
import GoalForm from '@/components/goals/GoalForm';
import TimeAllocationPie from '@/components/goals/visualizations/TimeAllocationPie';
import WeeklyTimeSummary from '@/components/goals/visualizations/WeeklyTimeSummary';
import { MigrationBanner } from '@/components/migration';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Target, Download } from 'lucide-react';
import { useGoals } from '@/contexts/GoalsContext';

export default function GoalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { goals } = useGoals();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/export/weekly');

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `life-designer-export-${new Date().toISOString().split('T')[0]}.md`;

      // Get the text content
      const text = await response.text();

      // Create a blob and download
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Помилка при експорті даних');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Назад
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-black dark:text-white">Мої цілі</h1>
            <Button
              onClick={handleExport}
              variant="ghost"
              size="icon"
              disabled={isExporting}
              title="Експортувати тижневий звіт"
              className="ml-2"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">
            Керуйте своїми життєвими цілями та пріоритетами
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Додати ціль
        </Button>
      </div>

      {/* Migration Banner */}
      <MigrationBanner />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals List - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <GoalsList />
        </div>

        {/* Visualizations Sidebar - Takes 1 column on large screens */}
        <div className="space-y-6">
          <WeeklyTimeSummary goals={goals} />
          <TimeAllocationPie />
        </div>
      </div>

      {/* Goal Form Modal */}
      <GoalForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </main>
  );
}
