'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConnectCalendarButtonProps {
  isConnected: boolean;
  onConnect?: () => void;
}

export function ConnectCalendarButton({ isConnected, onConnect }: ConnectCalendarButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get OAuth URL
      const response = await fetch('/api/calendar/connect');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate calendar connection');
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err) {
      console.error('Error connecting calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Google Calendar підключено. Події синхронізуються автоматично.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Підключіть Google Calendar для синхронізації подій
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleConnect}
        disabled={loading}
        className="w-full sm:w-auto"
        size="lg"
      >
        <Calendar className="mr-2 h-5 w-5" />
        {loading ? 'Підключення...' : 'Підключити Google Calendar'}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Після підключення ви зможете:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Переглядати події з Google Calendar</li>
          <li>Створювати нові події</li>
          <li>Редагувати та видаляти події</li>
          <li>Синхронізувати з іншими календарями</li>
        </ul>
        <p className="mt-2 text-xs">
          Ви завжди можете відключити доступ в налаштуваннях Google Account.
        </p>
      </div>
    </div>
  );
}
