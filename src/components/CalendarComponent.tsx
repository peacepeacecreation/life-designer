'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, AlertCircle, Calendar as CalendarIcon, Check } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarVisibility } from '@/hooks/useCalendarVisibility';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { AddCalendarEventDialog } from '@/components/calendar/AddCalendarEventDialog';
import type { CalendarEventWithGoal, CreateCalendarEventInput } from '@/types/calendar-events';
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
  color?: string;
}

export default function CalendarComponent() {
  const { data: session, status } = useSession();
  const { getTimeRange } = useCalendarSettings();
  const { showRecurringEvents, hiddenGoalIds, hiddenCategories } = useCalendarVisibility();
  const { events: dbEventsFromContext, createEvent, updateEvent, deleteEvent } = useCalendarEventsContext();
  const [view, setView] = useState<View>('month');
  const currentViewForHook = (view === 'work_week' ? 'week' : view) as 'month' | 'week' | 'day' | 'agenda';
  const { events, setGoogleEvents, setCurrentDate } = useCalendarEvents({
    showRecurringEvents,
    hiddenGoalIds,
    hiddenCategories,
    currentView: currentViewForHook,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarSynced, setCalendarSynced] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendarSynced') === 'true';
    }
    return false;
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithGoal | null>(null);
  const [dialogInitialStart, setDialogInitialStart] = useState<Date | undefined>();
  const [dialogInitialEnd, setDialogInitialEnd] = useState<Date | undefined>();

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
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        setGoogleEvents(formattedEvents);
        setCalendarSynced(true); // Успішно синхронізовано
      } else if (response.status === 401) {
        // Токен застарів або немає авторизації
        setError('Потрібна повторна авторизація через Google');
        setGoogleEvents([]);
        setCalendarSynced(false);
      } else {
        const errorData = await response.json();
        setError('Помилка завантаження подій з Google Calendar');
        console.error('Error loading calendar events:', errorData);
        setGoogleEvents([]);
        setCalendarSynced(false);
      }
    } catch (error) {
      setError('Помилка з\'єднання з Google Calendar');
      console.error('Error loading calendar events:', error);
      setGoogleEvents([]);
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

  const handleSelectSlot = useCallback(
    async ({ start, end }: { start: Date; end: Date }) => {
      if (status !== 'authenticated') {
        alert('Будь ласка, увійдіть в систему');
        return;
      }

      // Open dialog for creating new event
      setSelectedEvent(null);
      setDialogInitialStart(start);
      setDialogInitialEnd(end);
      setDialogOpen(true);
    },
    [status]
  );

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent) => {
      // Check if this is a DB event (can be edited)
      const dbEvent = events.find((e: any) => e.id === event.id && e.isFromDb);

      if (dbEvent) {
        // Open edit dialog for DB events
        // Fetch full event details from context
        const fullEvent = dbEventsFromContext.find((e) => e.id === event.id);

        if (fullEvent) {
          setSelectedEvent(fullEvent);
          setDialogInitialStart(undefined);
          setDialogInitialEnd(undefined);
          setDialogOpen(true);
        }
      } else {
        // Show info for Google/recurring events
        const message = `Подія: ${event.title}\n${event.description || ''}\n${
          event.location ? `Місце: ${event.location}` : ''
        }`;
        if (event.htmlLink && confirm(`${message}\n\nВідкрити в Google Calendar?`)) {
          window.open(event.htmlLink, '_blank');
        } else {
          alert(message);
        }
      }
    },
    [events, dbEventsFromContext]
  );

  // Handle saving event (create or update)
  const handleSaveEvent = useCallback(
    async (eventData: CreateCalendarEventInput, eventId?: string) => {
      try {
        if (eventId) {
          // Update existing event
          await updateEvent(eventId, eventData);
        } else {
          // Create new event
          await createEvent(eventData);
        }
      } catch (error) {
        console.error('Error saving event:', error);
        throw error;
      }
    },
    [createEvent, updateEvent]
  );

  // Handle deleting event
  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      try {
        await deleteEvent(eventId);
      } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
      }
    },
    [deleteEvent]
  );

  // Кастомні стилі для подій з кольорами
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.color) {
      // Конвертуємо hex в RGB для напівпрозорого фону
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      };

      const rgb = hexToRgb(event.color);
      const backgroundColor = rgb
        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
        : event.color;

      return {
        style: {
          backgroundColor,
          border: `1px solid ${event.color}`,
          color: event.color,
          fontWeight: '600',
          fontSize: '0.75rem',
        },
      };
    }
    return {};
  }, []);

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {status === 'authenticated' ? (
              calendarSynced ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Синхронізовано з Google Calendar
                    </span>
                  </div>
                  <Button
                    onClick={loadGoogleCalendarEvents}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Оновлення...' : 'Оновити'}
                  </Button>
                  <Button
                    onClick={() => setCalendarSynced(false)}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Відключити
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    Синхронізуйте з Google Calendar для перегляду подій
                  </span>
                  <Button
                    onClick={handleSyncCalendar}
                    disabled={loading}
                    variant="default"
                    size="sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {loading ? 'Синхронізація...' : 'Синхронізувати календар'}
                  </Button>
                </>
              )
            ) : (
              <span className="text-sm text-muted-foreground">
                Увійдіть в систему для використання календаря
              </span>
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
          min={getTimeRange().minTime}
          max={getTimeRange().maxTime}
          eventPropGetter={eventStyleGetter}
          formats={{
            eventTimeRangeFormat: () => '',
            weekdayFormat: (date) => {
              const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              return days[date.getDay()];
            },
            dayFormat: (date) => {
              const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
              const day = date.getDate();
              return `${day} ${days[date.getDay()].toLowerCase()}`;
            },
            dayRangeHeaderFormat: ({ start }) => {
              // Отримуємо номер тижня в році
              const onejan = new Date(start.getFullYear(), 0, 1);
              const weekNumber = Math.ceil((((start.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);

              return `${weekNumber} тиждень`;
            },
            dayHeaderFormat: (date) => {
              const days = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
              const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
                            'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

              return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
            },
            agendaHeaderFormat: ({ start }) => {
              const days = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
              const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер',
                            'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

              const day = days[start.getDay()];
              const date = start.getDate();
              const month = months[start.getMonth()];

              return `${day} ${date} ${month}`;
            },
            agendaDateFormat: (date) => {
              const days = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
              const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер',
                            'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

              return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
            },
            agendaTimeFormat: (date) => {
              return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', hour12: false });
            },
            agendaTimeRangeFormat: ({ start, end }) => {
              const formatTime = (date: Date) => date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', hour12: false });
              return `${formatTime(start)} – ${formatTime(end)}`;
            },
          }}
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

      {/* Add/Edit Event Dialog */}
      <AddCalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        initialStart={dialogInitialStart}
        initialEnd={dialogInitialEnd}
      />
    </div>
  );
}
