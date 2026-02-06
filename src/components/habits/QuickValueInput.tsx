'use client';

import { useState, useEffect } from 'react';
import { useHabits } from '@/contexts/HabitsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HabitTrackingType } from '@/types/habits';

interface QuickValueInputProps {
  habitId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function QuickValueInput({
  habitId,
  onClose,
  onComplete,
}: QuickValueInputProps) {
  const { habits, completeHabit } = useHabits();
  const habit = habits.find((h) => h.id === habitId);

  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick presets based on habit type
  const getQuickPresets = () => {
    if (!habit) return [];

    if (habit.trackingType === HabitTrackingType.NUMERIC) {
      const target = habit.targetValue || 100;
      return [
        { label: `${target * 0.5}`, value: target * 0.5 },
        { label: `${target * 0.75}`, value: target * 0.75 },
        { label: `${target}`, value: target },
      ];
    }

    if (habit.trackingType === HabitTrackingType.DURATION) {
      return [
        { label: '15 хв', value: 15 },
        { label: '30 хв', value: 30 },
        { label: '60 хв', value: 60 },
      ];
    }

    return [];
  };

  const quickPresets = getQuickPresets();

  const handleSubmit = async () => {
    if (!habit || !value) return;

    try {
      setIsSubmitting(true);

      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        alert('Будь ласка, введіть коректне число');
        return;
      }

      const completionData: any = {
        completionDate: new Date(),
        note: note || undefined,
      };

      if (habit.trackingType === HabitTrackingType.NUMERIC) {
        completionData.value = numericValue;
      } else if (habit.trackingType === HabitTrackingType.DURATION) {
        completionData.durationMinutes = Math.round(numericValue);
      }

      await completeHabit(habitId, completionData);
      onComplete();
    } catch (error) {
      console.error('Error completing habit:', error);
      alert('Помилка при збереженні. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!habit) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{habit.icon || '✓'}</span>
            {habit.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Value Input */}
          <div className="space-y-2">
            <Label htmlFor="value">
              {habit.trackingType === HabitTrackingType.NUMERIC
                ? `Скільки ${habit.unit || 'одиниць'}?`
                : 'Скільки часу (хвилин)?'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="value"
                type="number"
                step={
                  habit.trackingType === HabitTrackingType.DURATION ? '1' : '0.1'
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  habit.targetValue
                    ? `Ціль: ${habit.targetValue}`
                    : 'Введіть значення'
                }
                className="flex-1"
                autoFocus
              />
              {habit.unit && (
                <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                  {habit.unit}
                </div>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          {quickPresets.length > 0 && (
            <div className="space-y-2">
              <Label>Швидкі варіанти:</Label>
              <div className="flex gap-2">
                {quickPresets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue(preset.value.toString())}
                    className="flex-1"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Note (optional) */}
          <div className="space-y-2">
            <Label htmlFor="note">Коментар (опціонально)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Додайте коментар про виконання..."
              rows={2}
            />
          </div>

          {/* Target Progress */}
          {habit.targetValue && value && (
            <div className="text-sm text-muted-foreground">
              {parseFloat(value) >= habit.targetValue ? (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Ціль досягнута! 🎉
                </span>
              ) : (
                <span>
                  Прогрес:{' '}
                  {Math.round((parseFloat(value) / habit.targetValue) * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Скасувати
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value || isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? 'Збереження...' : 'Готово'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
