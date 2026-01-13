'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
} from 'lucide-react';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import { useGoals } from '@/contexts/GoalsContext';
import { formatDuration, formatDurationHuman } from '@/types/clockify';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';

export default function TimeEntriesList() {
  const { entries, loading, error, filters, setFilters } = useTimeTracking();
  const { goals } = useGoals();

  // Local filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goalId, setGoalId] = useState('');
  const [source, setSource] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Apply filters
  const handleApplyFilters = () => {
    setFilters({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      goalId: goalId || null,
      source: (source as any) || null,
    });
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setGoalId('');
    setSource('');
    setFilters({
      startDate: null,
      endDate: null,
      goalId: null,
      source: null,
    });
    setPage(0);
  };

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);

    setFilters({
      startDate: start,
      endDate: end,
      goalId: null,
      source: null,
    });
  }, []);

  // Pagination
  const totalPages = Math.ceil(entries.length / pageSize);
  const paginatedEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'clockify':
        return <Badge variant="default">Clockify</Badge>;
      case 'calendar_event':
        return <Badge variant="secondary">Календар</Badge>;
      case 'manual':
        return <Badge variant="outline">Вручну</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Помилка завантаження: {error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5" />
            <CardTitle>Фільтри</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Початкова дата</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Кінцева дата</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalFilter">Ціль</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger id="goalFilter">
                  <SelectValue placeholder="Всі цілі" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Всі цілі</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center gap-2">
                        {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                          (() => {
                            const iconOption = getIconById(goal.iconUrl!);
                            if (iconOption) {
                              const IconComponent = iconOption.Icon;
                              return <IconComponent className="w-4 h-4" style={{ color: goal.color }} />;
                            }
                            return null;
                          })()
                        ) : goal.iconUrl ? (
                          <img src={goal.iconUrl} alt="" className="w-4 h-4 object-contain" />
                        ) : null}
                        <span>{goal.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceFilter">Джерело</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="sourceFilter">
                  <SelectValue placeholder="Всі джерела" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Всі джерела</SelectItem>
                  <SelectItem value="clockify">Clockify</SelectItem>
                  <SelectItem value="calendar_event">Календар</SelectItem>
                  <SelectItem value="manual">Вручну</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Застосувати
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              Скинути
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>
                  {entries.length} записів знайдено
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Немає записів часу</p>
              <p className="text-sm mt-1">
                Спробуйте змінити фільтри або підключити Clockify для автоматичного імпорту
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Опис</TableHead>
                    <TableHead>Дата та час</TableHead>
                    <TableHead>Тривалість</TableHead>
                    <TableHead>Ціль</TableHead>
                    <TableHead>Проєкт</TableHead>
                    <TableHead>Джерело</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          {entry.description || (
                            <span className="text-muted-foreground italic">
                              Без опису
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(entry.startTime), 'dd MMM yyyy', { locale: uk })}
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(entry.startTime), 'HH:mm', { locale: uk })}
                            {entry.endTime && (
                              <>
                                {' - '}
                                {format(new Date(entry.endTime), 'HH:mm', { locale: uk })}
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {entry.durationSeconds ? (
                            <>
                              {formatDuration(entry.durationSeconds)}
                              <div className="text-xs text-muted-foreground">
                                {formatDurationHuman(entry.durationSeconds)}
                              </div>
                            </>
                          ) : (
                            <Badge variant="outline">В процесі</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.goal ? (
                          <div className="flex items-center gap-2">
                            {entry.goal.iconUrl && isPredefinedIcon(entry.goal.iconUrl) ? (
                              (() => {
                                const iconOption = getIconById(entry.goal.iconUrl!);
                                if (iconOption) {
                                  const IconComponent = iconOption.Icon;
                                  return <IconComponent className="w-5 h-5" style={{ color: entry.goal.color }} />;
                                }
                                return null;
                              })()
                            ) : entry.goal.iconUrl ? (
                              <img
                                src={entry.goal.iconUrl}
                                alt=""
                                className="w-5 h-5 object-contain"
                              />
                            ) : null}
                            <div>
                              <div className="font-medium text-sm">
                                {entry.goal.name}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {entry.goal.category}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Без цілі
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.clockifyProject ? (
                          <div className="flex items-center gap-2">
                            {entry.clockifyProject.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: entry.clockifyProject.color,
                                }}
                              />
                            )}
                            <span className="text-sm">
                              {entry.clockifyProject.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getSourceBadge(entry.source)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Сторінка {page + 1} з {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Попередня
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Наступна
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
