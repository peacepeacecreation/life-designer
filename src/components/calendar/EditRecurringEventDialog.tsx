/**
 * Edit Recurring Event Dialog
 *
 * Allows users to edit existing recurring events
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil } from 'lucide-react';
import {
  RecurringEvent,
  RecurrenceFrequency,
  DayOfWeek,
} from '@/types/recurring-events';
import { useGoals } from '@/contexts/GoalsContext';

interface EditRecurringEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RecurringEvent | null;
  onUpdate: (id: string, updates: Partial<RecurringEvent>) => Promise<void>;
}

const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Пн',
  [DayOfWeek.TUESDAY]: 'Вт',
  [DayOfWeek.WEDNESDAY]: 'Ср',
  [DayOfWeek.THURSDAY]: 'Чт',
  [DayOfWeek.FRIDAY]: 'Пт',
  [DayOfWeek.SATURDAY]: 'Сб',
  [DayOfWeek.SUNDAY]: 'Нд',
};

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  [RecurrenceFrequency.DAILY]: 'Щодня',
  [RecurrenceFrequency.WEEKLY]: 'Щотижня',
  [RecurrenceFrequency.MONTHLY]: 'Щомісяця',
};

const DEFAULT_COLORS = [
  { value: '#93c5fd', label: 'Синій' },
  { value: '#c4b5fd', label: 'Фіолетовий' },
  { value: '#f9a8d4', label: 'Рожевий' },
  { value: '#fcd34d', label: 'Помаранчевий' },
  { value: '#6ee7b7', label: 'Зелений' },
  { value: '#fca5a5', label: 'Червоний' },
];

export function EditRecurringEventDialog({
  open,
  onOpenChange,
  event,
  onUpdate,
}: EditRecurringEventDialogProps) {
  const { goals, loading: goalsLoading } = useGoals();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    RecurrenceFrequency.WEEKLY
  );
  const [interval, setInterval] = useState('1');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStartTime(event.startTime);
      setDuration(event.duration.toString());
      setFrequency(event.recurrence.frequency);
      setInterval(event.recurrence.interval.toString());
      setSelectedDays(event.recurrence.daysOfWeek || []);
      setColor(event.color || DEFAULT_COLORS[0].value);
      setGoalId(event.goalId);
    }
  }, [event]);

  const handleUpdate = async () => {
    if (!event) return;

    // Валідація
    if (!title.trim()) {
      alert('Будь ласка, введіть назву події');
      return;
    }

    if (!startTime.match(/^\d{2}:\d{2}$/)) {
      alert('Будь ласка, введіть час у форматі ГГ:ХХ (наприклад, 09:00)');
      return;
    }

    if (!duration || duration.trim() === '') {
      alert('Будь ласка, введіть тривалість у хвилинах');
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      alert('Будь ласка, введіть коректну тривалість у хвилинах');
      return;
    }

    if (!interval || interval.trim() === '') {
      alert('Будь ласка, введіть інтервал');
      return;
    }

    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum <= 0) {
      alert('Будь ласка, введіть коректний інтервал');
      return;
    }

    if (frequency === RecurrenceFrequency.WEEKLY && selectedDays.length === 0) {
      alert('Будь ласка, оберіть хоча б один день тижня');
      return;
    }

    const updates: Partial<RecurringEvent> = {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime,
      duration: durationNum,
      recurrence: {
        frequency,
        interval: intervalNum,
        daysOfWeek: frequency === RecurrenceFrequency.WEEKLY ? selectedDays : undefined,
      },
      color,
      goalId,
    };

    setIsSubmitting(true);
    try {
      await onUpdate(event.id, updates);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating recurring event:', error);
      alert('Помилка при оновленні події. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Сортовані дні тижня (починаючи з понеділка)
  const sortedDays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Редагувати подію
          </DialogTitle>
          <DialogDescription>
            Внесіть зміни до повторюваної події
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Назва */}
          <div className="grid gap-2">
            <Label htmlFor="edit-title">
              Назва події <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Щоденний созвон"
            />
          </div>

          {/* Опис */}
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Опис (опціонально)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Додаткова інформація про подію"
              rows={2}
            />
          </div>

          {/* Час і тривалість */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-start-time">
                Час початку <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-duration">
                Тривалість (хв) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-duration"
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    setDuration(val);
                  }
                }}
                placeholder="60"
              />
            </div>
          </div>

          {/* Частота повторення */}
          <div className="grid gap-2">
            <Label htmlFor="edit-frequency">
              Частота повторення <span className="text-destructive">*</span>
            </Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setFrequency(value as RecurrenceFrequency)
              }
            >
              <SelectTrigger id="edit-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Інтервал */}
          <div className="grid gap-2">
            <Label htmlFor="edit-interval">Кожен N {frequency === RecurrenceFrequency.DAILY ? 'день' : frequency === RecurrenceFrequency.WEEKLY ? 'тиждень' : 'місяць'}</Label>
            <Input
              id="edit-interval"
              type="text"
              inputMode="numeric"
              value={interval}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d+$/.test(val)) {
                  setInterval(val);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Наприклад: 1 = кожного {frequency === RecurrenceFrequency.DAILY ? 'дня' : frequency === RecurrenceFrequency.WEEKLY ? 'тижня' : 'місяця'}, 2 = кожного другого
            </p>
          </div>

          {/* Дні тижня (тільки для WEEKLY) */}
          {frequency === RecurrenceFrequency.WEEKLY && (
            <div className="grid gap-2">
              <Label>
                Дні тижня <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {sortedDays.map((day) => (
                  <div
                    key={day}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`edit-day-${day}`}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <label
                      htmlFor={`edit-day-${day}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {WEEKDAY_LABELS[day]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Колір */}
          <div className="grid gap-2">
            <Label htmlFor="edit-color">Колір</Label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-foreground scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Ціль */}
          <div className="grid gap-2">
            <Label htmlFor="edit-goal">Ціль (опціонально)</Label>
            <Select value={goalId} onValueChange={(value) => setGoalId(value === 'none' ? undefined : value)}>
              <SelectTrigger id="edit-goal" disabled={goalsLoading}>
                <SelectValue placeholder={goalsLoading ? 'Завантаження...' : 'Оберіть ціль'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без цілі</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Пов'яжіть подію з ціллю для кращого відстеження прогресу
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Скасувати
          </Button>
          <Button type="button" onClick={handleUpdate} disabled={isSubmitting}>
            <Pencil className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
