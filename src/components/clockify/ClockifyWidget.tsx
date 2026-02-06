'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, History, Loader2 } from 'lucide-react';
import { formatDuration } from '@/types/clockify';
import { ClockifyHistoryDialog } from './ClockifyHistoryDialog';
import { StartTimerDialog } from './StartTimerDialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Timer {
  id: string;
  description: string;
  startTime: string;
  durationSeconds: number;
  projectId?: string;
  goal?: {
    id: string;
    name: string;
    color: string;
  };
}

export function ClockifyWidget() {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [startTimerOpen, setStartTimerOpen] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const { toast } = useToast();

  // Load current timer
  const loadTimer = async () => {
    try {
      const response = await fetch('/api/clockify/current-timer');
      const data = await response.json();

      setConnected(data.connected);
      if (data.timer) {
        setTimer(data.timer);
        setCurrentDuration(data.timer.durationSeconds);
      } else {
        setTimer(null);
        setCurrentDuration(0);
      }
    } catch (error) {
      console.error('Error loading timer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update timer every second
  useEffect(() => {
    if (timer) {
      const interval = setInterval(() => {
        setCurrentDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Refresh timer every 5 seconds for faster updates
  useEffect(() => {
    loadTimer();
    const interval = setInterval(loadTimer, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for timer start events from other components
  useEffect(() => {
    const handleTimerStarted = () => {
      loadTimer();
    };

    window.addEventListener('clockify-timer-started', handleTimerStarted);
    return () => window.removeEventListener('clockify-timer-started', handleTimerStarted);
  }, []);

  const handleStop = async () => {
    if (!timer) return;

    setLoading(true);
    try {
      const response = await fetch('/api/clockify/stop-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryId: timer.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop timer');
      }

      toast({
        title: 'Таймер зупинено',
        description: `Записано ${formatDuration(currentDuration)}`,
      });

      // Notify about timer stop
      window.dispatchEvent(new Event('clockify-timer-started'));

      setTimer(null);
      setCurrentDuration(0);
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Timer Display */}
            <div className="flex flex-col min-w-[140px]">
              {timer ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-2xl font-mono font-bold tabular-nums">
                      {formatDuration(currentDuration)}
                    </span>
                  </div>
                  {timer.goal && (
                    <Badge
                      variant="secondary"
                      className="mt-1 text-xs truncate max-w-[140px]"
                      style={{ backgroundColor: timer.goal.color + '20' }}
                    >
                      {timer.goal.name}
                    </Badge>
                  )}
                  {timer.description && (
                    <span className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">
                      {timer.description}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-muted-foreground">
                    00:00
                  </span>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {timer ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStop}
                    disabled={loading}
                    className="h-8 border-2 border-black hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4 fill-red-500 text-red-500" />
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setStartTimerOpen(true)}
                    className="h-8 border-2 border-black"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryOpen(true)}
                  className="h-8 border-2 border-black"
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* History Dialog */}
      <ClockifyHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      {/* Start Timer Dialog */}
      <StartTimerDialog
        open={startTimerOpen}
        onOpenChange={setStartTimerOpen}
        onTimerStarted={loadTimer}
      />
    </>
  );
}
