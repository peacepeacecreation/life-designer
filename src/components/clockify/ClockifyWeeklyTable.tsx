'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDuration, formatDurationHuman } from '@/types/clockify';
import { format, startOfWeek, endOfWeek } from 'date-fns';
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

interface ClockifyWeeklyTableProps {
  currentWeekStart: Date;
  syncing: boolean;
  setSyncing: (syncing: boolean) => void;
}

export default function ClockifyWeeklyTable({
  currentWeekStart,
  syncing,
  setSyncing,
}: ClockifyWeeklyTableProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate week range
  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  // Load entries for current week
  useEffect(() => {
    if (!session?.user?.email) return;
    loadEntries();
  }, [session, currentWeekStart]);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch entries from API
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
    } finally {
      setLoading(false);
    }
  };

  // Manual sync - triggered from parent component
  useEffect(() => {
    if (syncing) {
      loadEntries()
        .then(() => {
          toast({
            title: 'Дані оновлено',
            description: 'Записи завантажено з Clockify',
          });
        })
        .catch((err: any) => {
          console.error('Sync error:', err);
          toast({
            title: 'Помилка оновлення',
            description: err.message,
            variant: 'destructive',
          });
        })
        .finally(() => {
          setSyncing(false);
        });
    }
  }, [syncing]);

  // Calculate total time for week
  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
  const totalBillableSeconds = entries.reduce(
    (sum, entry) => sum + (entry.is_billable ? entry.duration_seconds || 0 : 0),
    0
  );

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Week Title */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">
              {format(weekStart, 'd MMM', { locale: uk })} -{' '}
              {format(weekEnd, 'd MMM yyyy', { locale: uk })}
            </CardTitle>
          </div>

          {/* Right: Stats */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-muted/50 rounded-md text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{entries.length}</span>
              <span className="text-xs text-muted-foreground">записів</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{formatDurationHuman(totalSeconds)}</span>
              <span className="text-xs text-muted-foreground">всього</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{formatDurationHuman(totalBillableSeconds)}</span>
              <span className="text-xs text-muted-foreground">оплачувано</span>
            </div>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="flex lg:hidden items-center gap-3 mt-4 pt-4 border-t">
          <div className="flex flex-col items-center flex-1 px-2 py-1.5 bg-muted/50 rounded-md">
            <span className="text-xl font-bold">{entries.length}</span>
            <span className="text-xs text-muted-foreground">записів</span>
          </div>
          <div className="flex flex-col items-center flex-1 px-2 py-1.5 bg-muted/50 rounded-md">
            <span className="text-xl font-bold">{formatDurationHuman(totalSeconds)}</span>
            <span className="text-xs text-muted-foreground">всього</span>
          </div>
          <div className="flex flex-col items-center flex-1 px-2 py-1.5 bg-muted/50 rounded-md">
            <span className="text-xl font-bold">{formatDurationHuman(totalBillableSeconds)}</span>
            <span className="text-xs text-muted-foreground">оплачувано</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Завантаження...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>Немає записів за цей тиждень</p>
              <p className="text-sm mt-2">
                Спробуйте синхронізувати дані або виберіть інший тиждень
              </p>
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
                      {format(new Date(entry.start_time), 'EEE, d MMM', { locale: uk })}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.start_time), 'HH:mm')}
                        {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.description || (
                        <span className="text-muted-foreground italic">Без опису</span>
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
        </CardContent>
      </Card>
  );
}
