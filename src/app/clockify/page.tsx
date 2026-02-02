"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ClockifySyncTable from "@/components/clockify/ClockifySyncTable";
import { Button } from "@/components/ui/button";
import { startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ClockifySyncPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  );

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Image
                src="/clockify.svg"
                alt="Clockify"
                width={36}
                height={36}
                className="h-10 w-10"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">Clockify Sync</h1>
                <Badge variant="outline" className="text-xs">
                  Hash-based
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Автоматична синхронізація кожні 5 хвилин • Hash detection для
                змін
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Попередній</span>
            </Button>

            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Поточний
            </Button>

            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <span className="hidden sm:inline mr-1">Наступний</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Table */}
      <ClockifySyncTable currentWeekStart={currentWeekStart} />
    </div>
  );
}
