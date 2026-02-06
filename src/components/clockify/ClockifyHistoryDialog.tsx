'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { formatDuration, formatDurationHuman } from '@/types/clockify';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_billable: boolean;
  goal_name: string | null;
  clockify_project_name: string | null;
}

interface ClockifyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClockifyHistoryDialog({
  open,
  onOpenChange,
}: ClockifyHistoryDialogProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const { toast } = useToast();

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const loadEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/clockify/weekly-entries?weekStart=${weekStart.toISOString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load entries');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      console.error('Error loading entries:', err);
      setError(err.message);
      toast({
        title: 'Помилка завантаження',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open, currentWeekStart]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const totalSeconds = entries.reduce(
    (sum, entry) => sum + (entry.duration_seconds || 0),
    0
  );

  const totalBillableSeconds = entries.reduce(
    (sum, entry) =>
      sum + (entry.is_billable ? entry.duration_seconds || 0 : 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span>
                Історія Clockify ({format(weekStart, 'd MMM', { locale: uk })} -{' '}
                {format(weekEnd, 'd MMM yyyy', { locale: uk })})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Поточний
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEntries}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </DialogTitle>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 pt-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
              <span className="font-bold">{entries.length}</span>
              <span className="text-muted-foreground">записів</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
              <span className="font-bold">{formatDurationHuman(totalSeconds)}</span>
              <span className="text-muted-foreground">всього</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
              <span className="font-bold">
                {formatDurationHuman(totalBillableSeconds)}
              </span>
              <span className="text-muted-foreground">оплачувано</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {error ? (
            <div className="flex items-center justify-center p-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Помилка завантаження: {error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Завантаження...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>Немає записів за цей тиждень</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Опис</TableHead>
                  <TableHead>Проект</TableHead>
                  <TableHead>Ціль</TableHead>
                  <TableHead>Тривалість</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(entry.start_time), 'EEE, d MMM', {
                        locale: uk,
                      })}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.start_time), 'HH:mm')}
                        {entry.end_time &&
                          ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.description || (
                        <span className="text-muted-foreground italic">
                          Без опису
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.clockify_project_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.goal_name ? (
                        <Badge variant="secondary">{entry.goal_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatDuration(entry.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      {entry.is_billable ? (
                        <Badge variant="default">Оплачувано</Badge>
                      ) : (
                        <Badge variant="outline">Не оплачувано</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
