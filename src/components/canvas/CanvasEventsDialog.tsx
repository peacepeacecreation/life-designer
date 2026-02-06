'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  History,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Play,
  Square,
  Target,
  FileText,
  Filter,
  X,
  Calendar
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, endOfDay, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/date-picker';

interface CanvasEvent {
  id: string;
  canvas_id: string;
  user_id: string;
  event_type: string;
  target_id: string;
  event_data: any;
  slot_id: string | null;
  created_at: string;
}

interface CanvasEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId: string;
}

// Helper to get icon and color for event type
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'block_created':
      return { icon: Plus, color: 'text-green-600', bg: 'bg-green-50' };
    case 'goal_created':
      return { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' };
    case 'block_deleted':
      return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' };
    case 'block_renamed':
      return { icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'prompt_added':
      return { icon: FileText, color: 'text-green-600', bg: 'bg-green-50' };
    case 'prompt_deleted':
      return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' };
    case 'prompt_completed':
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' };
    case 'prompt_uncompleted':
      return { icon: Circle, color: 'text-gray-600', bg: 'bg-gray-50' };
    case 'clockify_started':
      return { icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'clockify_stopped':
      return { icon: Square, color: 'text-gray-600', bg: 'bg-gray-50' };
    default:
      return { icon: History, color: 'text-gray-600', bg: 'bg-gray-50' };
  }
}

// Helper to get event description
function getEventDescription(event: CanvasEvent): string {
  const data = event.event_data;

  switch (event.event_type) {
    case 'block_created':
      return `Створено блок "${data.title || 'Без назви'}"`;
    case 'goal_created':
      return `Створено ціль "${data.title || 'Без назви'}"`;
    case 'block_deleted':
      return `Видалено блок "${data.title || 'Без назви'}"`;
    case 'block_renamed':
      return `Перейменовано "${data.old_title}" → "${data.new_title}"`;
    case 'prompt_added':
      return `Додано промпт "${data.prompt_content}" в "${data.node_title}"`;
    case 'prompt_deleted':
      return `Видалено промпт "${data.prompt_content}" з "${data.node_title}"`;
    case 'prompt_completed':
      return `✓ Виконано "${data.prompt_content}" в "${data.node_title}"`;
    case 'prompt_uncompleted':
      return `Знято відмітку "${data.prompt_content}" в "${data.node_title}"`;
    case 'clockify_started':
      return `Запущено таймер для "${data.node_title}"${data.project_name ? ` (${data.project_name})` : ''}`;
    case 'clockify_stopped':
      return `Зупинено таймер для "${data.node_title}"`;
    default:
      return `Подія: ${event.event_type}`;
  }
}

// Event type labels
const eventTypeLabels: Record<string, string> = {
  block_created: 'Створення блоків',
  goal_created: 'Створення цілей',
  block_deleted: 'Видалення блоків',
  block_renamed: 'Перейменування блоків',
  prompt_added: 'Додавання промптів',
  prompt_deleted: 'Видалення промптів',
  prompt_completed: 'Виконання промптів ✓',
  prompt_uncompleted: 'Зняття відміток',
  clockify_started: 'Старт Clockify',
  clockify_stopped: 'Стоп Clockify',
};

type DateFilter = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

export function CanvasEventsDialog({
  open,
  onOpenChange,
  canvasId,
}: CanvasEventsDialogProps) {
  const [events, setEvents] = useState<CanvasEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<Set<string>>(new Set(Object.keys(eventTypeLabels)));
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open && canvasId) {
      loadEvents();
    }
  }, [open, canvasId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/canvas/events?canvasId=${canvasId}&limit=100`);
      if (!response.ok) throw new Error('Failed to load events');

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEventType = (eventType: string) => {
    const newSelected = new Set(selectedEventTypes);
    if (newSelected.has(eventType)) {
      newSelected.delete(eventType);
    } else {
      newSelected.add(eventType);
    }
    setSelectedEventTypes(newSelected);
  };

  const selectAll = () => {
    setSelectedEventTypes(new Set(Object.keys(eventTypeLabels)));
  };

  const clearAll = () => {
    setSelectedEventTypes(new Set());
  };

  // Filter by event type
  const typeFilteredEvents = events.filter(event => selectedEventTypes.has(event.event_type));

  // Filter by date
  const filteredEvents = useMemo(() => {
    let result = typeFilteredEvents;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    switch (dateFilter) {
      case 'today':
        result = result.filter(event => {
          const eventDate = new Date(event.created_at);
          return eventDate >= todayStart && eventDate <= todayEnd;
        });
        break;
      case 'yesterday':
        result = result.filter(event => {
          const eventDate = new Date(event.created_at);
          return eventDate >= yesterdayStart && eventDate <= yesterdayEnd;
        });
        break;
      case '7days':
        result = result.filter(event => {
          const eventDate = new Date(event.created_at);
          const sevenDaysAgo = subDays(now, 7);
          return eventDate >= sevenDaysAgo;
        });
        break;
      case '30days':
        result = result.filter(event => {
          const eventDate = new Date(event.created_at);
          const thirtyDaysAgo = subDays(now, 30);
          return eventDate >= thirtyDaysAgo;
        });
        break;
      case 'custom':
        if (customDateFrom || customDateTo) {
          result = result.filter(event => {
            const eventDate = new Date(event.created_at);
            const fromMatch = !customDateFrom || eventDate >= startOfDay(customDateFrom);
            const toMatch = !customDateTo || eventDate <= endOfDay(customDateTo);
            return fromMatch && toMatch;
          });
        }
        break;
      case 'all':
      default:
        // No date filtering
        break;
    }

    return result;
  }, [typeFilteredEvents, dateFilter, customDateFrom, customDateTo]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: { date: string; label: string; events: CanvasEvent[] }[] = [];
    const eventsByDay = new Map<string, CanvasEvent[]>();

    filteredEvents.forEach(event => {
      const eventDate = new Date(event.created_at);
      const dayKey = format(eventDate, 'yyyy-MM-dd');

      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    });

    // Sort by date descending
    const sortedDays = Array.from(eventsByDay.keys()).sort((a, b) => b.localeCompare(a));

    sortedDays.forEach(dayKey => {
      const dayEvents = eventsByDay.get(dayKey)!;
      const firstEventDate = new Date(dayEvents[0].created_at);

      let label: string;
      if (isToday(firstEventDate)) {
        label = 'Сьогодні';
      } else if (isYesterday(firstEventDate)) {
        label = 'Вчора';
      } else {
        label = format(firstEventDate, 'd MMMM yyyy', { locale: uk });
      }

      groups.push({
        date: dayKey,
        label,
        events: dayEvents,
      });
    });

    return groups;
  }, [filteredEvents]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Історія подій
          </DialogTitle>
          <DialogDescription>
            Всі дії в цьому canvas. Показано останні 100 подій.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-3 pb-2 border-b">
          {/* Type and Date filters row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Event type filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Filter className="h-3.5 w-3.5" />
                    Типи
                    {selectedEventTypes.size < Object.keys(eventTypeLabels).length && (
                      <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                        {selectedEventTypes.size}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px]" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Типи подій</h4>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={selectAll}
                          className="h-6 text-xs px-2"
                        >
                          Всі
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearAll}
                          className="h-6 text-xs px-2"
                        >
                          Очистити
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(eventTypeLabels).map(([type, label]) => {
                        const { icon: Icon, color } = getEventIcon(type);
                        return (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={type}
                              checked={selectedEventTypes.has(type)}
                              onCheckedChange={() => toggleEventType(type)}
                            />
                            <label
                              htmlFor={type}
                              className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                            >
                              <Icon className={`h-3.5 w-3.5 ${color}`} />
                              {label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Date filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Період
                    {dateFilter !== 'all' && (
                      <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                        1
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px]" align="start">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Період</h4>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant={dateFilter === 'all' ? 'default' : 'ghost'}
                        onClick={() => setDateFilter('all')}
                        className="w-full justify-start"
                      >
                        Весь час
                      </Button>
                      <Button
                        size="sm"
                        variant={dateFilter === 'today' ? 'default' : 'ghost'}
                        onClick={() => setDateFilter('today')}
                        className="w-full justify-start"
                      >
                        Сьогодні
                      </Button>
                      <Button
                        size="sm"
                        variant={dateFilter === 'yesterday' ? 'default' : 'ghost'}
                        onClick={() => setDateFilter('yesterday')}
                        className="w-full justify-start"
                      >
                        Вчора
                      </Button>
                      <Button
                        size="sm"
                        variant={dateFilter === '7days' ? 'default' : 'ghost'}
                        onClick={() => setDateFilter('7days')}
                        className="w-full justify-start"
                      >
                        Останні 7 днів
                      </Button>
                      <Button
                        size="sm"
                        variant={dateFilter === '30days' ? 'default' : 'ghost'}
                        onClick={() => setDateFilter('30days')}
                        className="w-full justify-start"
                      >
                        Останні 30 днів
                      </Button>
                      <div className="pt-2 border-t">
                        <Button
                          size="sm"
                          variant={dateFilter === 'custom' ? 'default' : 'ghost'}
                          onClick={() => setDateFilter('custom')}
                          className="w-full justify-start mb-2"
                        >
                          Власний період
                        </Button>
                        {dateFilter === 'custom' && (
                          <div className="space-y-2 pl-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Від:</label>
                              <DatePicker
                                date={customDateFrom}
                                onSelect={setCustomDateFrom}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">До:</label>
                              <DatePicker
                                date={customDateTo}
                                onSelect={setCustomDateTo}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {(selectedEventTypes.size < Object.keys(eventTypeLabels).length || dateFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    selectAll();
                    setDateFilter('all');
                    setCustomDateFrom(undefined);
                    setCustomDateTo(undefined);
                  }}
                  className="gap-1 h-8 text-xs"
                >
                  <X className="h-3 w-3" />
                  Скинути всі
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              {filteredEvents.length} з {events.length} подій
            </div>
          </div>
        </div>

        {/* Events timeline with day grouping */}
        <div className="overflow-y-auto max-h-[500px] py-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Завантаження...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Поки що немає подій
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEvents.map((group) => (
                <div key={group.date} className="space-y-2">
                  {/* Day separator */}
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-border" />
                    <div className="text-xs font-medium text-muted-foreground px-2">
                      {group.label}
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Events for this day */}
                  <div className="space-y-2">
                    {group.events.map((event) => {
                      const { icon: Icon, color, bg } = getEventIcon(event.event_type);
                      const description = getEventDescription(event);
                      const timestamp = new Date(event.created_at);

                      return (
                        <div
                          key={event.id}
                          className="flex gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                        >
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(timestamp, 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          💡 Події зберігаються автоматично.
        </div>
      </DialogContent>
    </Dialog>
  );
}
