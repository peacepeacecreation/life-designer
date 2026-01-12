"use client";

import { useMemo } from "react";
import { Goal } from "@/types";
import { useRecurringEvents } from "@/contexts/RecurringEventsContext";
import { useCalendarEventsContext } from "@/contexts/CalendarEventsContext";
import { calculateGoalTimeProgress } from "@/utils/goalTimeProgress";
import { generateEventsFromRecurring } from "@/utils/recurringEvents";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, isBefore, isWithinInterval, format } from "date-fns";
import { uk } from "date-fns/locale";

interface WeeklyProgressProps {
  goal: Goal;
}

interface EventInstance {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isCompleted: boolean;
}

export default function WeeklyProgress({ goal }: WeeklyProgressProps) {
  const { recurringEvents } = useRecurringEvents();
  const { events: calendarEvents } = useCalendarEventsContext();

  const progress = useMemo(() => {
    return calculateGoalTimeProgress(
      goal.id,
      goal.timeAllocated,
      recurringEvents,
      calendarEvents
    );
  }, [goal.id, goal.timeAllocated, recurringEvents, calendarEvents]);

  const events = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const eventsList: EventInstance[] = [];

    // Додаємо повторювані події
    const goalRecurringEvents = recurringEvents.filter(
      event => event.isActive && event.goalId === goal.id
    );

    goalRecurringEvents.forEach(recurringEvent => {
      const instances = generateEventsFromRecurring(recurringEvent, weekStart, weekEnd);

      instances.forEach(instance => {
        eventsList.push({
          id: `recurring-${recurringEvent.id}-${instance.start.getTime()}`,
          title: recurringEvent.title,
          start: instance.start,
          end: instance.end,
          isCompleted: isBefore(instance.end, now),
        });
      });
    });

    // Додаємо одноразові події з календаря
    const goalCalendarEvents = calendarEvents.filter(
      event => event.goalId === goal.id
    );

    goalCalendarEvents.forEach(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      const isInWeek = isWithinInterval(eventStart, { start: weekStart, end: weekEnd }) ||
                       isWithinInterval(eventEnd, { start: weekStart, end: weekEnd });

      if (isInWeek) {
        eventsList.push({
          id: event.id,
          title: event.title,
          start: eventStart,
          end: eventEnd,
          isCompleted: isBefore(eventEnd, now),
        });
      }
    });

    // Сортуємо за часом початку
    return eventsList.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [goal.id, recurringEvents, calendarEvents]);

  const completedEvents = events.filter(e => e.isCompleted);
  const upcomingEvents = events.filter(e => !e.isCompleted);

  const formatEventTime = (start: Date, end: Date) => {
    return `${format(start, "HH:mm", { locale: uk })} - ${format(end, "HH:mm", { locale: uk })}`;
  };

  const formatEventDate = (date: Date) => {
    return format(date, "EEEE, d MMMM", { locale: uk });
  };

  const getDuration = (start: Date, end: Date) => {
    const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}г ${mins}хв` : `${mins}хв`;
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar з тултипом */}
      <Card className="bg-white dark:bg-card">
        <CardHeader>
          <h2 className="text-xl font-semibold text-black dark:text-white">Прогрес поточного тижня</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative h-4 w-full rounded-full overflow-hidden bg-[var(--background)] cursor-help">
                {/* Completed segment - solid black */}
                <div
                  className="absolute left-0 top-0 h-full bg-black dark:bg-white transition-all border"
                  style={{ width: `${progress.completedPercent}%` }}
                />

                {/* Scheduled segment - striped black */}
                <div
                  className="absolute top-0 h-full bg-striped-black dark:bg-striped-white transition-all bg-white rounded-xl"
                  style={{
                    left: `${progress.completedPercent}%`,
                    width: `${progress.scheduledPercent}%`,
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold border-b border-background/20 pb-1 mb-1.5">
                  Деталі часу на тиждень:
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-background/80">Зроблено:</span>
                  <span className="font-semibold">{progress.completed} год</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-background/80">Заплановано:</span>
                  <span className="font-semibold">{progress.scheduled} год</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-background/80">Треба запланувати:</span>
                  <span className="font-semibold">{progress.unscheduled} год</span>
                </div>
                <div className="flex justify-between gap-4 pt-1.5 mt-1.5 border-t border-background/20">
                  <span className="text-background/80">Всього виділено:</span>
                  <span className="font-semibold">{progress.totalAllocated} год</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-black dark:text-white">{progress.completed} год</p>
              <p className="text-sm text-muted-foreground">Зроблено</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-black dark:text-white">{progress.scheduled} год</p>
              <p className="text-sm text-muted-foreground">Заплановано</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-black dark:text-white">{progress.unscheduled} год</p>
              <p className="text-sm text-muted-foreground">Не заплановано</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Events */}
      {completedEvents.length > 0 && (
        <Card className="bg-white dark:bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Виконані події ({completedEvents.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <h3 className="font-semibold text-black dark:text-white">{event.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatEventDate(event.start)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventTime(event.start, event.end)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-card">
                    {getDuration(event.start, event.end)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-white dark:bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Заплановані події ({upcomingEvents.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <h3 className="font-semibold text-black dark:text-white">{event.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatEventDate(event.start)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventTime(event.start, event.end)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-card">
                    {getDuration(event.start, event.end)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Events */}
      {events.length === 0 && (
        <Card className="bg-white dark:bg-card">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Немає подій на цьому тижні</p>
              <p className="text-sm mt-1">Додайте події в календар або створіть повторювану подію</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
