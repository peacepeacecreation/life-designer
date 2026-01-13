/**
 * Add Recurring Event Dialog
 *
 * Allows users to create new recurring events with custom schedules
 */

'use client';

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
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
import { Plus } from 'lucide-react';
import {
  RecurringEvent,
  RecurrenceFrequency,
  DayOfWeek,
} from '@/types/recurring-events';
import { useGoals } from '@/contexts/GoalsContext';

interface AddRecurringEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (event: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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

export function AddRecurringEventDialog({
  open,
  onOpenChange,
  onAdd,
}: AddRecurringEventDialogProps) {
  const { goals, loading: goalsLoading } = useGoals();

  // Debug: log goals when dialog opens
  if (open && goals.length > 0) {
    console.log('Available goals in dialog:', goals.map(g => ({ id: g.id, name: g.name, priority: g.priority })));
  }
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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setDuration('60');
    setFrequency(RecurrenceFrequency.WEEKLY);
    setInterval('1');
    setSelectedDays([]);
    setColor(DEFAULT_COLORS[0].value);
    setGoalId(undefined);
  };

  const handleAdd = async () => {
    // Валідація
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть назву події" });
      return;
    }

    if (!startTime.match(/^\d{2}:\d{2}$/)) {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть час у форматі ГГ:ХХ (наприклад, 09:00)" });
      return;
    }

    if (!duration || duration.trim() === '') {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть тривалість у хвилинах" });
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть коректну тривалість у хвилинах" });
      return;
    }

    if (!interval || interval.trim() === '') {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть інтервал" });
      return;
    }

    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum <= 0) {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, введіть коректний інтервал" });
      return;
    }

    if (frequency === RecurrenceFrequency.WEEKLY && selectedDays.length === 0) {
      toast({ variant: "destructive", title: "Помилка", description: "Будь ласка, оберіть хоча б один день тижня" });
      return;
    }

    const newEvent: Omit<RecurringEvent, 'id' | 'createdAt' | 'updatedAt'> = {
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
      isActive: true,
    };

    setIsSubmitting(true);
    try {
      await onAdd(newEvent);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding recurring event:', error);
      toast({ variant: "destructive", title: "Помилка", description: "Помилка при додаванні події. Спробуйте ще раз." });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Додати повторювану подію
          </DialogTitle>
          <DialogDescription>
            Створіть подію, яка автоматично повторюється за вибраним розкладом
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Назва */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Назва події <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Щоденний созвон"
            />
          </div>

          {/* Опис */}
          <div className="grid gap-2">
            <Label htmlFor="description">Опис (опціонально)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Додаткова інформація про подію"
              rows={2}
            />
          </div>

          {/* Час і тривалість */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-time">
                Час початку <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">
                Тривалість (хв) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duration"
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
            <Label htmlFor="frequency">
              Частота повторення <span className="text-destructive">*</span>
            </Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setFrequency(value as RecurrenceFrequency)
              }
            >
              <SelectTrigger id="frequency">
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
            <Label htmlFor="interval">Кожен N {frequency === RecurrenceFrequency.DAILY ? 'день' : frequency === RecurrenceFrequency.WEEKLY ? 'тиждень' : 'місяць'}</Label>
            <Input
              id="interval"
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
                      id={`day-${day}`}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <label
                      htmlFor={`day-${day}`}
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
            <Label htmlFor="color">Колір</Label>
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
            <Label htmlFor="goal">Ціль (опціонально)</Label>
            <Select value={goalId} onValueChange={(value) => setGoalId(value === 'none' ? undefined : value)}>
              <SelectTrigger id="goal" disabled={goalsLoading}>
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
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Скасувати
          </Button>
          <Button type="button" onClick={handleAdd} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Додавання...' : 'Додати подію'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
