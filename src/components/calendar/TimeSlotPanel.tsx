"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings2, RefreshCw, Square, Play, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDurationHuman } from "@/types/clockify";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { useClockify } from "@/contexts/ClockifyContext";
import { useToast } from "@/hooks/use-toast";
import { useGoals } from "@/contexts/GoalsContext";
import { isPredefinedIcon, getIconById } from "@/lib/goalIcons";
import { getCategoryMeta } from "@/lib/categoryConfig";

export function TimeSlotPanel() {
  const { isConnected, entries, loading, loadingEntries, refetchEntries } =
    useClockify();
  const { goals } = useGoals();
  const { toast } = useToast();
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const handleStopTimer = async (timeEntryId: string) => {
    setStoppingId(timeEntryId);
    try {
      const response = await fetch("/api/clockify/stop-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeEntryId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Помилка зупинки таймера");
      }

      toast({
        title: "Таймер зупинено",
        description: "Час збережено",
      });

      setTimeout(() => {
        refetchEntries();
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Помилка",
        description: error.message || "Не вдалося зупинити таймер",
        variant: "destructive",
      });
    } finally {
      setStoppingId(null);
    }
  };

  const handleReplayTimer = async (entry: any) => {
    if (!entry.goal_id) {
      toast({
        title: "Помилка",
        description: "Не вдалося знайти ціль для цього запису",
        variant: "destructive",
      });
      return;
    }

    setReplayingId(entry.id);
    try {
      const response = await fetch("/api/clockify/start-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: entry.goal_id,
          description: entry.description || "Повтор задачі",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Помилка запуску таймера");
      }

      toast({
        title: "Таймер запущено",
        description: "Задача відновлена",
      });

      setTimeout(() => {
        refetchEntries();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Помилка",
        description: error.message || "Не вдалося запустити таймер",
        variant: "destructive",
      });
    } finally {
      setReplayingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Завантаження...
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="p-8 text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-blue-100 dark:bg-blue-950 rounded-lg">
            <Image
              src="/clockify.svg"
              alt="Clockify"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </div>
        </div>
        <p className="text-muted-foreground">
          Налаштуйте Clockify, щоб відстежувати ваші часові записи
        </p>
        <Button asChild className="w-full">
          <Link href="/settings?tab=clockify">
            <Settings2 className="h-4 w-4 mr-2" />
            Перейти до налаштувань
          </Link>
        </Button>
      </Card>
    );
  }

  // Get recent entries sorted by start time (newest first), limited to current week
  const recentEntries = entries.sort(
    (a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );

  return (
    <Card className="p-4 bg-white">
      {loadingEntries ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Завантаження...</span>
        </div>
      ) : recentEntries.length > 0 ? (
        <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
          {recentEntries.map((entry) => {
            const isActive = !entry.end_time;
            const isStopping = stoppingId === entry.id;
            const isReplaying = replayingId === entry.id;
            const entryGoal = goals.find((g) => g.id === entry.goal_id);
            const categoryMeta = entryGoal
              ? getCategoryMeta(entryGoal.category)
              : null;

            return (
              <Card
                key={entry.id}
                className={`p-3 ${isActive ? "bg-amber-50 border-amber-200" : "bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {entryGoal?.iconUrl &&
                    isPredefinedIcon(entryGoal.iconUrl) ? (
                      (() => {
                        const iconOption = getIconById(entryGoal.iconUrl!);
                        if (iconOption) {
                          const IconComponent = iconOption.Icon;
                          return (
                            <IconComponent
                              className="h-4 w-4 shrink-0"
                              style={{
                                color: entryGoal.color || categoryMeta?.color,
                              }}
                            />
                          );
                        }
                        return null;
                      })()
                    ) : entryGoal?.iconUrl ? (
                      <img
                        src={entryGoal.iconUrl}
                        alt={entryGoal.name}
                        className="h-4 w-4 object-contain shrink-0"
                      />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${isActive ? "text-amber-900" : ""}`}
                      >
                        {entry.description || "Без опису"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs ${isActive ? "text-amber-700" : "text-muted-foreground"}`}
                        >
                          {format(new Date(entry.start_time), "EEE, HH:mm", {
                            locale: uk,
                          })}
                        </span>
                        {entry.goal_name && (
                          <>
                            <span
                              className={`text-xs ${isActive ? "text-amber-700" : "text-muted-foreground"}`}
                            >
                              •
                            </span>
                            <span
                              className={`text-xs ${isActive ? "text-amber-800" : "text-primary"}`}
                            >
                              {entry.goal_name}
                            </span>
                          </>
                        )}
                        {isActive && (
                          <>
                            <span className="text-xs text-amber-700">•</span>
                            <span className="text-xs text-amber-700">
                              Активна
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-xs font-mono ${isActive ? "text-amber-700" : "text-muted-foreground"}`}
                    >
                      {formatDurationHuman(entry.duration_seconds)}
                    </div>
                    {isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleStopTimer(entry.id)}
                        disabled={isStopping}
                      >
                        {isStopping ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Square className="h-3 w-3" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleReplayTimer(entry)}
                        disabled={isReplaying}
                      >
                        {isReplaying ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Немає записів за цей тиждень
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href="/clockify">Всі записи</Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href="/settings?tab=clockify">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Налаштування
          </Link>
        </Button>
      </div>
    </Card>
  );
}
