"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { formatDuration, formatDurationHuman } from "@/types/clockify";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_billable: boolean;
  goal_name: string | null;
  clockify_project_name: string | null;
  content_hash: string | null;
  last_synced_at: string | null;
}

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
}

interface ClockifySyncTableProps {
  currentWeekStart: Date;
}

// Auto-sync interval: 5 minutes
const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function ClockifySyncTable({
  currentWeekStart,
}: ClockifySyncTableProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [, setTick] = useState(0); // For forcing re-render to update "Xхв назад" text

  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate week range
  // currentWeekStart is already the Monday of the week
  const weekStart = currentWeekStart;
  const weekEnd = addDays(weekStart, 6); // Sunday (6 days after Monday)

  // Load entries from database
  useEffect(() => {
    if (!session?.user?.email) return;
    loadEntries();
  }, [session, currentWeekStart]);

  // Update UI every 30 seconds to refresh "Xхв назад" text
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync logic: sync if last sync was more than 5 minutes ago
  useEffect(() => {
    if (!session?.user?.email) return;

    const checkAndSync = async () => {
      const now = new Date();

      if (!lastSyncTime) {
        // Never synced → sync now
        await syncWeek();
        return;
      }

      const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();

      if (timeSinceLastSync > AUTO_SYNC_INTERVAL) {
        // More than 5 minutes → auto-sync
        console.log("Auto-sync triggered (5+ minutes since last sync)");
        await syncWeek();
      }
    };

    // Check immediately
    checkAndSync();

    // Set up interval to check every 30 seconds (for UI updates and sync check)
    const interval = setInterval(checkAndSync, 30 * 1000);

    return () => clearInterval(interval);
  }, [session, currentWeekStart, lastSyncTime]);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      // Format as local date string to avoid timezone issues
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartStr = `${year}-${month}-${day}`;

      console.log('[ClockifySyncTable] Loading entries for week:', weekStartStr);

      // Fetch entries from our database with cache-busting timestamp
      const response = await fetch(
        `/api/clockify/weekly-entries?weekStart=${weekStartStr}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load entries");
      }

      const data = await response.json();
      console.log('[ClockifySyncTable] Received entries:', data.entries?.length || 0);
      console.log('[ClockifySyncTable] Week range from API:', data.weekStart, 'to', data.weekEnd);
      setEntries(data.entries || []);

      // Get last sync time from entries
      if (data.entries && data.entries.length > 0) {
        const latestSync = data.entries
          .map((e: any) => e.last_synced_at)
          .filter(Boolean)
          .sort()
          .reverse()[0];

        if (latestSync) {
          setLastSyncTime(new Date(latestSync));
        }
      }
    } catch (err: any) {
      console.error("Error loading entries:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manual sync
  const syncWeek = async () => {
    setSyncing(true);
    setSyncStats(null);

    try {
      // Format as local date string to avoid timezone issues
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartStr = `${year}-${month}-${day}`;

      console.log("Syncing week:", weekStartStr);

      const response = await fetch("/api/clockify/sync-week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart: weekStartStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync");
      }

      const data = await response.json();

      setSyncStats(data.stats);
      setLastSyncTime(new Date());

      // Reload entries to show updated data
      await loadEntries();

      toast({
        title: "Синхронізація завершена",
        description: `Додано: ${data.stats.inserted}, Оновлено: ${data.stats.updated}, Пропущено: ${data.stats.skipped}`,
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({
        title: "Помилка синхронізації",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Calculate total time for week
  const totalSeconds = entries.reduce(
    (sum, entry) => sum + (entry.duration_seconds || 0),
    0,
  );

  // Time since last sync
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return "ще не синхронізовано";

    const now = new Date();
    const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(timeSinceLastSync / 60000);

    if (minutes === 0) return "тільки що";
    if (minutes === 1) return "1хв назад";
    return `${minutes}хв назад`;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Week Title + Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-xl">
                {format(weekStart, "d MMM", { locale: uk })} -{" "}
                {format(weekEnd, "d MMM yyyy", { locale: uk })}
              </CardTitle>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-muted/30 rounded-md border border-border/50">
              <span className="text-md ">
                Count:{" "}
                <span className="text-lg font-semibold">{entries.length}</span>
              </span>
              <div className="h-5 w-[1px] bg-black" />
              <span className="text-lg font-semibold">
                {formatDurationHuman(totalSeconds)}
              </span>
            </div>
          </div>

          {/* Right: Sync Controls */}
          <div className="flex items-center gap-3">
            {/* Sync Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-md text-sm">
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Синхронізація...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">
                    {getTimeSinceSync()}
                  </span>
                </>
              )}
            </div>

            {/* Manual Sync Button */}
            <Button
              variant="default"
              size="sm"
              onClick={syncWeek}
              disabled={syncing || loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""} mr-2`}
              />
              Оновити зараз
            </Button>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="flex lg:hidden items-center gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-md border border-border/50">
            <span className="text-base font-bold">{entries.length}</span>
            <div className="h-5 w-px bg-border" />
            <span className="text-base font-semibold">
              {formatDurationHuman(totalSeconds)}
            </span>
          </div>
        </div>

        {/* Sync Stats (if available) */}
        {syncStats && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <span>Остання синхронізація:</span>
            <Badge variant="secondary">{syncStats.inserted} додано</Badge>
            <Badge variant="secondary">{syncStats.updated} оновлено</Badge>
            <Badge variant="outline">{syncStats.skipped} пропущено</Badge>
          </div>
        )}
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
              Натисніть "Оновити зараз" для синхронізації з Clockify
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
                    {format(new Date(entry.start_time), "EEE, d MMM", {
                      locale: uk,
                    })}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.start_time), "HH:mm")}
                      {entry.end_time &&
                        ` - ${format(new Date(entry.end_time), "HH:mm")}`}
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
      </CardContent>
    </Card>
  );
}
