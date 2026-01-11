/**
 * Migration Banner Component
 *
 * Displays a banner prompting users to migrate their goals from localStorage to Supabase.
 * Shows progress during migration and handles success/error states.
 *
 * Usage:
 *   <MigrationBanner />
 *
 * Behavior:
 * - Only shows if goals exist in localStorage
 * - Hides after successful migration (flag stored in localStorage)
 * - Shows progress during migration
 * - Displays errors if migration fails
 */

'use client';

import { useState } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CloudUpload, CheckCircle2, AlertCircle, Database } from 'lucide-react';

type MigrationStatus = 'idle' | 'migrating' | 'success' | 'error';

interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: number;
  errorDetails?: Array<{ goalId: string; error: string }>;
}

export function MigrationBanner() {
  const { goals } = useGoals();
  const [status, setStatus] = useState<MigrationStatus>('idle');
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check if migration was already completed
  if (typeof window !== 'undefined') {
    const migrationCompleted = localStorage.getItem('migration-completed');
    if (migrationCompleted === 'true') {
      return null;
    }
  }

  // Don't show if no goals to migrate
  if (goals.length === 0) {
    return null;
  }

  // Don't show if already migrated or in error state after retry
  if ((status as string) === 'success') {
    return null;
  }

  const handleMigrate = async () => {
    setStatus('migrating');
    setErrorMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/migrate/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 503 Service Unavailable specially
        if (response.status === 503) {
          throw new Error(
            'База даних не налаштована. Для міграції необхідно додати Supabase credentials до .env.local'
          );
        }
        throw new Error((data as any).error || data.details || 'Migration failed');
      }

      setResult(data);

      if (data.success && data.errors === 0) {
        setStatus('success');
        // Mark migration as completed
        localStorage.setItem('migration-completed', 'true');

        // Refresh page after 2 seconds to load from Supabase
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (data.errors > 0) {
        setStatus('error');
        setErrorMessage(
          `Мігровано ${data.migrated} з ${goals.length} цілей. ` +
          `${data.errors} помилок. Перегляньте деталі нижче.`
        );
      } else {
        setStatus('success');
        localStorage.setItem('migration-completed', 'true');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Невідома помилка при міграції');
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {(status as string) === 'success' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : status === 'error' ? (
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : status === 'migrating' ? (
                <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Idle State */}
            {status === 'idle' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Мігрувати дані в хмару
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ваші цілі зараз зберігаються локально в браузері. Мігруйте їх у хмару для:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
                  <li>Доступу з будь-якого пристрою</li>
                  <li>Семантичного пошуку по цілях</li>
                  <li>Безпечного зберігання даних</li>
                  <li>Синхронізації між пристроями</li>
                </ul>
                <div className="flex items-center gap-3">
                  <Button onClick={handleMigrate} size="default">
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Мігрувати {goals.length} {goals.length === 1 ? 'ціль' : 'цілей'}
                  </Button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Це займе ~10-30 секунд
                  </span>
                </div>
              </>
            )}

            {/* Migrating State */}
            {status === 'migrating' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Міграція в процесі...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Генеруємо embeddings та переміщуємо дані в Supabase. Будь ласка, зачекайте.
                </p>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Обробка {goals.length} цілей...
                  </span>
                </div>
              </>
            )}

            {/* Success State */}
            {(status as string) === 'success' && result && (
              <>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Міграція завершена успішно!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Мігровано {result.migrated} {result.migrated === 1 ? 'ціль' : 'цілей'} у хмару.
                  Сторінка перезавантажиться автоматично...
                </p>
              </>
            )}

            {/* Error State */}
            {status === 'error' && (
              <>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Помилка міграції
                </h3>
                <Alert className="mb-4">
                  <AlertDescription className="text-sm">
                    {errorMessage}
                  </AlertDescription>
                </Alert>

                {result && result.errorDetails && result.errorDetails.length > 0 && (
                  <details className="mb-4">
                    <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Деталі помилок ({result.errorDetails.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {result.errorDetails.map((detail, idx) => (
                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          <strong>Goal ID:</strong> {detail.goalId}
                          <br />
                          <strong>Error:</strong> {detail.error}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-3">
                  <Button onClick={handleMigrate} variant="default" size="default">
                    Спробувати знову
                  </Button>
                  <Button
                    onClick={() => {
                      setStatus('idle');
                      setErrorMessage('');
                      setResult(null);
                    }}
                    variant="outline"
                    size="default"
                  >
                    Скасувати
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
