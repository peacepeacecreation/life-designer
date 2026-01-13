'use client';

import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarEventsContext } from '@/contexts/CalendarEventsContext';
import { AddCalendarEventDialog } from '@/components/calendar/AddCalendarEventDialog';
import type { CalendarEventWithGoal, CreateCalendarEventInput } from '@/types/calendar-events';
import type { Goal } from '@/types/goals';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  htmlLink?: string;
  isRecurring?: boolean;
  isFromDb?: boolean;
  color?: string;
  goalId?: string;
}

const Calendar = withDragAndDrop<CalendarEvent>(BigCalendar);

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

interface GoalWeekCalendarProps {
  goal: Goal;
}

export default function GoalWeekCalendar({ goal }: GoalWeekCalendarProps) {
  const { getTimeRange } = useCalendarSettings();
  const { events: dbEventsFromContext, createEvent, updateEvent, deleteEvent } = useCalendarEventsContext();
  const { events, setCurrentDate } = useCalendarEvents({
    showRecurringEvents: true,
    hiddenGoalIds: [],
    hiddenCategories: [],
    currentView: 'week',
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithGoal | null>(null);
  const [dialogInitialStart, setDialogInitialStart] = useState<Date | undefined>();
  const [dialogInitialEnd, setDialogInitialEnd] = useState<Date | undefined>();

  // Фільтруємо події тільки для поточної цілі
  const filteredEvents = useMemo(() => {
    return events.filter(event => event.goalId === goal.id);
  }, [events, goal.id]);

  const handleSelectSlot = useCallback(
    async ({ start, end }: { start: Date; end: Date }) => {
      // Open dialog for creating new event with pre-selected goal
      setSelectedEvent(null);
      setDialogInitialStart(start);
      setDialogInitialEnd(end);
      setDialogOpen(true);
    },
    []
  );

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent) => {
      // Check if this is a DB event (can be edited)
      const dbEvent = events.find((e: any) => e.id === event.id && e.isFromDb);

      if (dbEvent) {
        // Open edit dialog for DB events
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
        // Автоматично прив'язуємо подію до поточної цілі
        const dataWithGoal = {
          ...eventData,
          goalId: goal.id,
        };

        if (eventId) {
          await updateEvent(eventId, dataWithGoal);
        } else {
          await createEvent(dataWithGoal);
        }
      } catch (error) {
        console.error('Error saving event:', error);
        throw error;
      }
    },
    [createEvent, updateEvent, goal.id]
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

  // Handle event drop (drag to new time slot)
  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: any; start: string | Date; end: string | Date }) => {
      if (!event.isFromDb) {
        alert('Ця подія не може бути переміщена. Тільки власні події можна редагувати.');
        return;
      }

      try {
        const startDate = start instanceof Date ? start : new Date(start);
        const endDate = end instanceof Date ? end : new Date(end);

        const eventData: CreateCalendarEventInput = {
          title: event.title,
          description: event.description,
          location: event.location,
          startTime: startDate,
          endTime: endDate,
          allDay: event.allDay,
          goalId: goal.id,
          color: event.color,
        };

        await updateEvent(event.id, eventData);
      } catch (error) {
        console.error('Error updating event:', error);
        alert('Помилка при переміщенні події');
      }
    },
    [updateEvent, goal.id]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: any; start: string | Date; end: string | Date }) => {
      if (!event.isFromDb) {
        alert('Ця подія не може бути змінена. Тільки власні події можна редагувати.');
        return;
      }

      try {
        const startDate = start instanceof Date ? start : new Date(start);
        const endDate = end instanceof Date ? end : new Date(end);

        const eventData: CreateCalendarEventInput = {
          title: event.title,
          description: event.description,
          location: event.location,
          startTime: startDate,
          endTime: endDate,
          allDay: event.allDay,
          goalId: goal.id,
          color: event.color,
        };

        await updateEvent(event.id, eventData);
      } catch (error) {
        console.error('Error resizing event:', error);
        alert('Помилка при зміні розміру події');
      }
    },
    [updateEvent, goal.id]
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.color) {
      const isHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(event.color);

      if (isHex) {
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

  return (
    <>
      <Card className="bg-white dark:bg-card p-0 overflow-hidden">
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
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
            view="week"
            views={['week']}
            toolbar={true}
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
            }}
            messages={{
              next: 'Далі',
              previous: 'Назад',
              today: 'Сьогодні',
              week: 'Тиждень',
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
        initialGoalId={goal.id}
      />
    </>
  );
}
