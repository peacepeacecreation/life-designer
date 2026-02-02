'use client';

import { useState, useEffect } from 'react';
import WeekSnapshotCard from './WeekSnapshotCard';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoalSnapshot {
  goal_id: string;
  goal_name: string;
  goal_color: string | null;
  time_allocated: number;
  time_completed: number;
  time_scheduled: number;
  time_unscheduled: number;
}

interface SnapshotData {
  snapshot: {
    id: string;
    week_start_date: string;
    week_end_date: string;
    total_available_hours: number;
    total_allocated_hours: number;
    total_completed_hours: number;
    total_scheduled_hours: number;
    free_time_hours: number;
    is_frozen: boolean;
    created_at: string;
    updated_at: string;
  };
  goalSnapshots: GoalSnapshot[];
}

interface SnapshotWithOffset {
  weekOffset: number;
  data: SnapshotData | null;
  hasChanges: boolean;
  canRecalculate: boolean;
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'Поточний тиждень';
  if (weekOffset === -1) return 'Минулий тиждень';
  if (weekOffset === -2) return '2 тижні тому';
  if (weekOffset === -3) return '3 тижні тому';
  if (weekOffset === -4) return '4 тижні тому';
  return `${Math.abs(weekOffset)} тижнів тому`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function WeekSnapshotHistory() {
  const [snapshots, setSnapshots] = useState<SnapshotWithOffset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculatingWeek, setRecalculatingWeek] = useState<number | null>(null);

  // Number of weeks to show
  const WEEKS_TO_SHOW = 12;

  // Fetch all snapshots
  useEffect(() => {
    fetchAllSnapshots();
  }, []);

  const fetchAllSnapshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const promises: Promise<SnapshotWithOffset>[] = [];

      // Fetch last 12 weeks (starting from -1, current week snapshots usually don't exist yet)
      for (let i = -1; i >= -WEEKS_TO_SHOW; i--) {
        promises.push(fetchSnapshotWithChanges(i));
      }

      const results = await Promise.all(promises);

      // Filter out weeks without snapshots
      const snapshotsWithData = results.filter(s => s.data !== null);

      setSnapshots(snapshotsWithData);
    } catch (err: any) {
      console.error('Error fetching snapshots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshotWithChanges = async (weekOffset: number): Promise<SnapshotWithOffset> => {
    try {
      // Fetch snapshot
      const snapshotResponse = await fetch(`/api/snapshots?weekOffset=${weekOffset}`);
      const snapshotData = await snapshotResponse.json();

      // Fetch change status
      let hasChanges = false;
      let canRecalculate = false;

      if (snapshotData.snapshot) {
        const changesResponse = await fetch(`/api/snapshots/check-changes?weekOffset=${weekOffset}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          hasChanges = changesData.hasChanges || false;
          canRecalculate = changesData.canRecalculate || false;
        }
      }

      return {
        weekOffset,
        data: snapshotData.snapshot ? snapshotData : null,
        hasChanges,
        canRecalculate,
      };
    } catch (err) {
      return {
        weekOffset,
        data: null,
        hasChanges: false,
        canRecalculate: false,
      };
    }
  };

  const handleRecalculate = async (weekOffset: number) => {
    setRecalculatingWeek(weekOffset);

    try {
      const response = await fetch('/api/snapshots/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate');
      }

      // Refresh that specific snapshot
      const updated = await fetchSnapshotWithChanges(weekOffset);
      setSnapshots(prev => prev.map(s => s.weekOffset === weekOffset ? updated : s));
    } catch (err: any) {
      console.error('Error recalculating:', err);
      setError(err.message);
    } finally {
      setRecalculatingWeek(null);
    }
  };

  // Transform snapshot data to card format
  const transformToCardData = (snapshot: SnapshotWithOffset) => {
    if (!snapshot.data) return null;

    const { snapshot: snapshotData, goalSnapshots } = snapshot.data;

    return {
      weekLabel: getWeekLabel(snapshot.weekOffset),
      weekStart: formatDate(snapshotData.week_start_date),
      weekEnd: formatDate(snapshotData.week_end_date),
      totalAvailable: snapshotData.total_available_hours,
      totalAllocated: snapshotData.total_allocated_hours,
      totalCompleted: snapshotData.total_completed_hours,
      totalScheduled: snapshotData.total_scheduled_hours,
      freeTime: snapshotData.free_time_hours,
      monthlyIncome: 0,
      currency: 'USD',
      goals: goalSnapshots.map((gs) => ({
        id: gs.goal_id,
        name: gs.goal_name,
        color: gs.goal_color || '#3b82f6',
        timeAllocated: gs.time_allocated,
        timeCompleted: gs.time_completed,
        timeScheduled: gs.time_scheduled,
        timeUnscheduled: gs.time_unscheduled,
      })),
    };
  };

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Завантаження історії...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-500">Помилка завантаження</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Snapshots State */}
      {!loading && !error && snapshots.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">Немає історії</p>
              <p className="text-sm text-muted-foreground mb-4">
                Snapshots створюються автоматично щопонеділка о 00:01.
                <br />
                Зачекайте до наступного понеділка або створіть snapshot вручну.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snapshots List */}
      {!loading && !error && snapshots.map((snapshot) => {
        const cardData = transformToCardData(snapshot);
        if (!cardData) return null;

        return (
          <div key={snapshot.weekOffset}>
            {/* Change Status Banner */}
            {snapshot.hasChanges && (
              <Card className="border-yellow-500/50 bg-yellow-500/5 mb-2">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Дані змінились після створення snapshot</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Цілі або повторювані події були змінені.
                      </p>
                    </div>
                    {snapshot.canRecalculate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecalculate(snapshot.weekOffset)}
                        disabled={recalculatingWeek === snapshot.weekOffset}
                        className="flex-shrink-0"
                      >
                        {recalculatingWeek === snapshot.weekOffset ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Перерахунок...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Перерахувати
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Snapshot Card */}
            <WeekSnapshotCard snapshot={cardData} />
          </div>
        );
      })}
    </div>
  );
}
