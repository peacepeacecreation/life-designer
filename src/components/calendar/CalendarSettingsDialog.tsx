/**
 * Calendar Settings Dialog
 *
 * Allows users to configure calendar work hours display
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarSettings } from '@/hooks/useCalendarSettings';
import { Settings2, RotateCcw } from 'lucide-react';

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CalendarSettings;
  onSave: (settings: Partial<CalendarSettings>) => void;
  onReset: () => void;
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  onReset,
}: CalendarSettingsDialogProps) {
  const [startHour, setStartHour] = useState(settings.startHour);
  const [endHour, setEndHour] = useState(settings.endHour);

  // Update local state when settings change
  useEffect(() => {
    setStartHour(settings.startHour);
    setEndHour(settings.endHour);
  }, [settings]);

  const handleSave = () => {
    if (startHour >= endHour) {
      alert('Початкова година має бути меншою за кінцеву');
      return;
    }

    onSave({
      startHour,
      endHour,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    if (confirm('Скинути налаштування до значень за замовчуванням?')) {
      onReset();
      setStartHour(0);
      setEndHour(23);
    }
  };

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Налаштування календаря
          </DialogTitle>
          <DialogDescription>
            Вкажіть робочі години для відображення у тижневому та денному вигляді календаря
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Start Hour */}
          <div className="grid gap-2">
            <Label htmlFor="start-hour">Початок робочого дня</Label>
            <Select
              value={startHour.toString()}
              onValueChange={(value) => setStartHour(parseInt(value))}
            >
              <SelectTrigger id="start-hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Календар буде показувати час починаючи з цієї години
            </p>
          </div>

          {/* End Hour */}
          <div className="grid gap-2">
            <Label htmlFor="end-hour">Кінець робочого дня</Label>
            <Select
              value={endHour.toString()}
              onValueChange={(value) => setEndHour(parseInt(value))}
            >
              <SelectTrigger id="end-hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Календар буде показувати час до цієї години
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium mb-1">Відображення:</p>
            <p className="text-sm text-muted-foreground">
              Робочі години: {startHour.toString().padStart(2, '0')}:00 -{' '}
              {endHour.toString().padStart(2, '0')}:59
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ({endHour - startHour} годин на день)
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Скинути
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Скасувати
            </Button>
            <Button type="button" onClick={handleSave}>
              Зберегти
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
