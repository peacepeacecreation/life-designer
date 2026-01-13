'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeekLabel } from '@/utils/goalTimeProgress';

interface WeekSelectorProps {
  selectedWeekOffset: number;
  onWeekChange: (weekOffset: number) => void;
  weeksToShow?: number;
}

export function WeekSelector({ selectedWeekOffset, onWeekChange, weeksToShow = 12 }: WeekSelectorProps) {
  // Генеруємо список тижнів (поточний + N минулих)
  const weeks = Array.from({ length: weeksToShow }, (_, i) => -i);

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium">Тиждень:</label>
      <Select
        value={selectedWeekOffset.toString()}
        onValueChange={(value) => onWeekChange(parseInt(value, 10))}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((weekOffset) => (
            <SelectItem key={weekOffset} value={weekOffset.toString()}>
              {getWeekLabel(weekOffset)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
