/**
 * Migration Banner Component
 *
 * First handles migrating goals from localStorage to Supabase,
 * then suggests regenerating embeddings for better semantic search.
 *
 * Usage:
 *   <MigrationBanner />
 *
 * Behavior:
 * - Checks if localStorage has goals that need migration
 * - If yes, shows migration UI
 * - If no, shows embedding regeneration suggestion with mysterious messaging
 * - Hides after successful operation
 */

'use client';

import { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useGoals } from '@/contexts/GoalsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {  Sparkles, CheckCircle2, AlertCircle, Brain, CloudUpload, Database } from 'lucide-react';
import { Goal } from '@/types/goals';

type BannerMode = 'migration' | 'embedding-regeneration';
type ProcessStatus = 'idle' | 'processing' | 'success' | 'error';

interface ProcessResult {
  message?: string;
  updated?: number;
  failed?: number;
  migrated?: number;
  errors?: number;
  errorDetails?: Array<{ goalId: string; error: string }>;
}

export function MigrationBanner() {
  const { goals: apiGoals, loading, refetch } = useGoals();
  const [mode, setMode] = useState<BannerMode | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [localStorageGoals, setLocalStorageGoals] = useState<Goal[]>([]);

  // Check what needs to be shown
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      // Check if there are goals in localStorage
      const stored = localStorage.getItem('life-designer-goals');
      const migrationCompleted = localStorage.getItem('migration-completed');

      if (stored && migrationCompleted !== 'true') {
        try {
          const data = JSON.parse(stored);
          if (data.goals && data.goals.length > 0) {
            setLocalStorageGoals(data.goals);
            setMode('migration');
            return;
          }
        } catch (e) {
          console.error('Error parsing localStorage goals:', e);
        }
      }

      // If migration is done or no localStorage goals, check for embedding regeneration
      const bannerDismissed = localStorage.getItem('embeddings-banner-dismissed');
      const lastRegeneration = localStorage.getItem('last-embeddings-regeneration');
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      if (apiGoals.length > 0) {
        if (!bannerDismissed && (!lastRegeneration || parseInt(lastRegeneration) < sevenDaysAgo)) {
          setMode('embedding-regeneration');
        }
      }
    }
  }, [apiGoals, loading]);

  // Don't show if loading or no mode determined
  if (loading || !mode) {
    return null;
  }

  // Don't show if already succeeded in this session
  if (status === 'success') {
    return null;
  }

  const handleMigrate = async () => {
    setStatus('processing');
    setErrorMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/migrate/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: localStorageGoals }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Migration failed');
      }

      setResult(data);

      if (data.success && data.errors === 0) {
        setStatus('success');
        localStorage.setItem('migration-completed', 'true');

        // Refresh goals from API
        await refetch();

        // Reload page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (data.errors > 0) {
        setStatus('error');
        setErrorMessage(
          `Мігровано ${data.migrated} з ${localStorageGoals.length} цілей. ` +
          `${data.errors} помилок.`
        );
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Невідома помилка при міграції');
    }
  };

  const handleRegenerate = async () => {
    setStatus('processing');
    setErrorMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/goals/regenerate-embeddings', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Regeneration failed');
      }

      setResult(data);
      setStatus('success');

      localStorage.setItem('last-embeddings-regeneration', Date.now().toString());

      setTimeout(() => {
        setMode(null);
      }, 3000);
    } catch (error: any) {
      console.error('Regeneration error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Невідома помилка при оновленні');
    }
  };

  const handleDismiss = () => {
    if (mode === 'embedding-regeneration') {
      localStorage.setItem('embeddings-banner-dismissed', 'true');
    }
    setMode(null);
  };

  // Different styles based on mode
  const cardClassName = mode === 'migration'
    ? "mb-6 border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
    : "mb-6 border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900";

  return (
    <Card className={cardClassName}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              {(status as ProcessStatus) === 'success' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              ) : status === 'error' ? (
                <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              ) : status === 'processing' ? (
                <Loader2 className="h-7 w-7 text-slate-600 dark:text-slate-400 animate-spin" />
              ) : mode === 'migration' ? (
                <CloudUpload className="h-7 w-7 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sparkles className="h-7 w-7 text-slate-600 dark:text-slate-400" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* MIGRATION MODE - Idle State */}
            {mode === 'migration' && status === 'idle' && (
              <>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Мігрувати дані в хмару
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Ваші цілі зберігаються локально. Синхронізуйте їх із Supabase для доступу з будь-якого пристрою
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleMigrate}
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm"
                  >
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Мігрувати {localStorageGoals.length} {localStorageGoals.length === 1 ? 'ціль' : 'цілей'}
                  </Button>
                  <span className="text-xs text-slate-400 dark:text-slate-500">~10-30 сек</span>
                </div>
              </>
            )}

            {/* EMBEDDING REGENERATION MODE - Idle State */}
            {mode === 'embedding-regeneration' && status === 'idle' && (
              <>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Оновити семантичні індекси
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Система може переосмислити ваші цілі для покращення пошуку та розуміння зв'язків
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRegenerate}
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Оновити індекси
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="default"
                    variant="ghost"
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    Пропустити
                  </Button>
                </div>
              </>
            )}

            {/* Processing State */}
            {status === 'processing' && (
              <>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {mode === 'migration' ? 'Міграція в процесі' : 'Оновлення індексів'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {mode === 'migration'
                    ? 'Генеруємо embeddings та переміщуємо дані...'
                    : 'Аналіз семантичних зв\'язків...'}
                </p>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {mode === 'migration' ? `Обробка ${localStorageGoals.length} цілей...` : 'Обробка...'}
                  </span>
                </div>
              </>
            )}

            {/* Success State */}
            {(status as ProcessStatus) === 'success' && result && (
              <>
                <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                  {mode === 'migration' ? 'Міграція завершена' : 'Індекси оновлено'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {mode === 'migration'
                    ? `Успішно мігровано ${result.migrated} ${result.migrated === 1 ? 'ціль' : 'цілей'}. Перезавантаження...`
                    : `Оновлено ${result.updated} індексів`}
                </p>
              </>
            )}

            {/* Error State */}
            {status === 'error' && (
              <>
                <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-1">
                  Помилка {mode === 'migration' ? 'міграції' : 'оновлення'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {errorMessage}
                </p>

                {result?.errorDetails && result.errorDetails.length > 0 && (
                  <details className="mb-4">
                    <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      Деталі помилок ({result.errorDetails.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {result.errorDetails.map((detail, idx) => (
                        <div key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          <strong>Goal:</strong> {detail.goalId}<br />
                          <strong>Error:</strong> {detail.error}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    onClick={mode === 'migration' ? handleMigrate : handleRegenerate}
                    size="default"
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm"
                  >
                    Спробувати знову
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="default"
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    Закрити
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
