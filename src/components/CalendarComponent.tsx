'use client';

import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarVisibility } from '@/hooks/useCalendarVisibility';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { AddCalendarEventDialog } from '@/components/calendar/AddCalendarEventDialog';
import type { CalendarEventWithGoal, CreateCalendarEventInput } from '@/types/calendar-events';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const Calendar = withDragAndDrop(BigCalendar);

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

interface CalendarComponentProps {
  googleEvents?: any[];
}

export default function CalendarComponent({ googleEvents = [] }: CalendarComponentProps) {
  const { data: session, status } = useSession();
  const { getTimeRange } = useCalendarSettings();
  const { showRecurringEvents, hiddenGoalIds, hiddenCategories } = useCalendarVisibility();
  const { events: dbEventsFromContext, createEvent, updateEvent, deleteEvent } = useCalendarEventsContext();
  const [view, setView] = useState<View>('week');
  const currentViewForHook = (view === 'work_week' ? 'week' : view) as 'month' | 'week' | 'day' | 'agenda';
  const { events, setGoogleEvents, setCurrentDate } = useCalendarEvents({
    showRecurringEvents,
    hiddenGoalIds,
    hiddenCategories,
    currentView: currentViewForHook,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithGoal | null>(null);
  const [dialogInitialStart, setDialogInitialStart] = useState<Date | undefined>();
  const [dialogInitialEnd, setDialogInitialEnd] = useState<Date | undefined>();

  // Оновлюємо Google події коли змінюються пропси
  useEffect(() => {
    setGoogleEvents(googleEvents);
  }, [googleEvents, setGoogleEvents]);

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
      // Перевіряємо чи це hex колір
      const isHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(event.color);

      if (isHex) {
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
      } else {
        // Це HSL CSS змінна (hsl(var(--goal-work)))
        // Використовуємо напряму з прозорістю через opacity
        return {
          style: {
            backgroundColor: event.color,
            borderLeft: `3px solid ${event.color}`,
            opacity: 0.9,
            fontWeight: '600',
            fontSize: '0.75rem',
          },
        };
      }
    }
    return {};
  }, []);

  // Handle event drop (drag to new time slot)
  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
      // Only allow dragging DB events (not Google or recurring)
      if (!event.isFromDb) {
        alert('Ця подія не може бути переміщена. Тільки власні події можна редагувати.');
        return;
      }

      try {
        const eventData: CreateCalendarEventInput = {
          title: event.title,
          description: event.description,
          location: event.location,
          startTime: start,
          endTime: end,
          allDay: event.allDay,
          goalId: event.goalId,
          color: event.color,
        };

        await updateEvent(event.id, eventData);
      } catch (error) {
        console.error('Error updating event:', error);
        alert('Помилка при переміщенні події');
      }
    },
    [updateEvent]
  );

  // Handle event resize (drag edges to change duration)
  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
      // Only allow resizing DB events
      if (!event.isFromDb) {
        alert('Ця подія не може бути змінена. Тільки власні події можна редагувати.');
        return;
      }

      try {
        const eventData: CreateCalendarEventInput = {
          title: event.title,
          description: event.description,
          location: event.location,
          startTime: start,
          endTime: end,
          allDay: event.allDay,
          goalId: event.goalId,
          color: event.color,
        };

        await updateEvent(event.id, eventData);
      } catch (error) {
        console.error('Error resizing event:', error);
        alert('Помилка при зміні розміру події');
      }
    },
    [updateEvent]
  );

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-card p-0 overflow-hidden">
        <div className="h-[calc(100vh-280px)] min-h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            draggableAccessor={(event: any) => !!event.isFromDb}
            resizableAccessor={(event: any) => !!event.isFromDb}
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
      </Card>

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
