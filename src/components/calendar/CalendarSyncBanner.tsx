'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, AlertCircle, Calendar as CalendarIcon, Check } from 'lucide-react';

interface CalendarSyncBannerProps {
  onGoogleEventsLoaded?: (events: any[]) => void;
}

export function CalendarSyncBanner({ onGoogleEventsLoaded }: CalendarSyncBannerProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarSynced, setCalendarSynced] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendarSynced') === 'true';
    }
    return false;
  });

  // Зберігаємо стан синхронізації
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarSynced', calendarSynced.toString());
    }
  }, [calendarSynced]);

  // Завантаження подій з Google Calendar
  useEffect(() => {
    if (status === 'authenticated' && calendarSynced) {
      loadGoogleCalendarEvents();
    }
  }, [status, calendarSynced]);

  const loadGoogleCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/calendar/events');
      if (response.ok) {
        const data = await response.json();
        const formattedEvents = data.events.map((event: any) => ({
          ...event,
          start: event.start instanceof Date ? event.start : new Date(Date.parse(event.start)),
          end: event.end instanceof Date ? event.end : new Date(Date.parse(event.end)),
        }));
        onGoogleEventsLoaded?.(formattedEvents);
        setCalendarSynced(true); // Успішно синхронізовано
      } else if (response.status === 401) {
        // Токен застарів або немає авторизації
        setError('Потрібна повторна авторизація через Google');
        onGoogleEventsLoaded?.([]);
        setCalendarSynced(false);
      } else {
        const errorData = await response.json();
        setError('Помилка завантаження подій з Google Calendar');
        console.error('Error loading calendar events:', errorData);
        onGoogleEventsLoaded?.([]);
        setCalendarSynced(false);
      }
    } catch (error) {
      setError('Помилка з\'єднання з Google Calendar');
      console.error('Error loading calendar events:', error);
      onGoogleEventsLoaded?.([]);
      setCalendarSynced(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (status !== 'authenticated') {
      setError('Спочатку потрібно увійти в систему');
      return;
    }
    await loadGoogleCalendarEvents();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-destructive/10 dark:bg-destructive/20 p-4 border-destructive/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
              {status === 'authenticated' && (
                <p className="text-xs text-destructive/80 mt-1">
                  Спробуйте вийти та увійти знову
                </p>
              )}
            </div>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
            >
              Закрити
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-white dark:bg-card p-4">
        <h3 className="font-semibold mb-3 text-sm">Google Calendar</h3>
        <div className="space-y-3">
          {status === 'authenticated' ? (
            calendarSynced ? (
              <>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Синхронізовано
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={loadGoogleCalendarEvents}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Оновлення...' : 'Оновити'}
                  </Button>
                  <Button
                    onClick={() => setCalendarSynced(false)}
                    variant="outline"
                    size="sm"
                    className="w-full text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    Відключити
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Синхронізуйте з Google Calendar для перегляду подій
                </p>
                <Button
                  onClick={handleSyncCalendar}
                  disabled={loading}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {loading ? 'Синхронізація...' : 'Синхронізувати'}
                </Button>
              </>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              Увійдіть в систему для синхронізації
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
