'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useState, useCallback, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, LogOut, LogIn } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  uk: uk,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  htmlLink?: string;
}

export default function CalendarComponent() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>('month');
  const [loading, setLoading] = useState(false);

  // Завантаження подій з Google Calendar
  useEffect(() => {
    if (status === 'authenticated') {
      loadGoogleCalendarEvents();
    }
  }, [status]);

  const loadGoogleCalendarEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/events');
      if (response.ok) {
        const data = await response.json();
        const formattedEvents = data.events.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = useCallback(
    async ({ start, end }: { start: Date; end: Date }) => {
      if (status !== 'authenticated') {
        alert('Будь ласка, увійдіть через Google для створення подій');
        return;
      }

      const title = window.prompt('Назва нової події:');
      if (title) {
        try {
          const response = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              start: start.toISOString(),
              end: end.toISOString(),
            }),
          });

          if (response.ok) {
            await loadGoogleCalendarEvents();
            alert('Подію створено успішно!');
          } else {
            alert('Помилка при створенні події');
          }
        } catch (error) {
          console.error('Error creating event:', error);
          alert('Помилка при створенні події');
        }
      }
    },
    [status]
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const message = `Подія: ${event.title}\n${event.description || ''}\n${
      event.location ? `Місце: ${event.location}` : ''
    }`;
    if (event.htmlLink && confirm(`${message}\n\nВідкрити в Google Calendar?`)) {
      window.open(event.htmlLink, '_blank');
    } else {
      alert(message);
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {status === 'authenticated' ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Підключено до Google Calendar
                </span>
                <Button
                  onClick={() => signOut()}
                  variant="outline"
                  size="sm"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Вийти
                </Button>
                <Button
                  onClick={loadGoogleCalendarEvents}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Оновлення...' : 'Оновити події'}
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  Увійдіть для синхронізації з Google Calendar
                </span>
                <Button
                  onClick={() => signIn('google')}
                  variant="default"
                  size="sm"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Увійти через Google
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="h-[calc(100vh-280px)] min-h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          view={view}
          onView={setView}
          culture="uk"
          messages={{
            next: 'Далі',
            previous: 'Назад',
            today: 'Сьогодні',
            month: 'Місяць',
            week: 'Тиждень',
            day: 'День',
            agenda: 'Порядок денний',
            date: 'Дата',
            time: 'Час',
            event: 'Подія',
            noEventsInRange: 'Немає подій у цьому діапазоні',
            showMore: (total) => `+ ще ${total}`,
          }}
        />
      </div>
    </div>
  );
}
