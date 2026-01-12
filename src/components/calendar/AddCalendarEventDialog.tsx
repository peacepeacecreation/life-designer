/**
 * Add/Edit Calendar Event Dialog
 *
 * Allows users to create new calendar events or edit existing ones
 * Supports goal association, date/time selection, and custom colors
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
import { useGoals } from '@/contexts/GoalsContext';
import type { CalendarEventWithGoal, CreateCalendarEventInput } from '@/types/calendar-events';
import { getCategoryMeta } from '@/lib/categoryConfig';

interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: CreateCalendarEventInput, eventId?: string) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  event?: CalendarEventWithGoal | null; // For editing existing event
  initialStart?: Date; // For creating new event with pre-filled start time
  initialEnd?: Date;   // For creating new event with pre-filled end time
}

const DEFAULT_COLORS = [
  { value: '#93c5fd', label: 'Синій' },
  { value: '#c4b5fd', label: 'Фіолетовий' },
  { value: '#f9a8d4', label: 'Рожевий' },
  { value: '#fcd34d', label: 'Помаранчевий' },
  { value: '#6ee7b7', label: 'Зелений' },
  { value: '#fca5a5', label: 'Червоний' },
];

export function AddCalendarEventDialog({
  open,
  onOpenChange,
  onSave,
  onDelete,
  event,
  initialStart,
  initialEnd,
}: AddCalendarEventDialogProps) {
  const { goals } = useGoals();
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [goalId, setGoalId] = useState<string>('');
  const [color, setColor] = useState(DEFAULT_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Format time for input (HH:MM)
  const formatTimeForInput = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditing && event) {
        // Editing existing event
        setTitle(event.title);
        setDescription(event.description || '');
        setLocation(event.location || '');
        setStartDate(formatDateForInput(event.startTime));
        setStartTime(formatTimeForInput(event.startTime));
        setEndDate(formatDateForInput(event.endTime));
        setEndTime(formatTimeForInput(event.endTime));
        setAllDay(event.allDay);
        setGoalId(event.goalId || '');
        setColor(event.color || DEFAULT_COLORS[0].value);
      } else {
        // Creating new event
        const start = initialStart || new Date();
        const end = initialEnd || new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

        setTitle('');
        setDescription('');
        setLocation('');
        setStartDate(formatDateForInput(start));
        setStartTime(formatTimeForInput(start));
        setEndDate(formatDateForInput(end));
        setEndTime(formatTimeForInput(end));
        setAllDay(false);
        setGoalId('');
        setColor(DEFAULT_COLORS[0].value);
      }
    }
  }, [open, isEditing, event, initialStart, initialEnd]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setAllDay(false);
    setGoalId('');
    setColor(DEFAULT_COLORS[0].value);
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      alert('Будь ласка, введіть назву події');
      return;
    }

    if (!startDate || !endDate) {
      alert('Будь ласка, оберіть дату початку та кінця');
      return;
    }

    if (!allDay && (!startTime || !endTime)) {
      alert('Будь ласка, оберіть час початку та кінця');
      return;
    }

    // Build start and end times
    let start: Date;
    let end: Date;

    if (allDay) {
      // For all-day events, use start of day and end of day
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    } else {
      start = new Date(`${startDate}T${startTime}`);
      end = new Date(`${endDate}T${endTime}`);
    }

    // Validate time range
    if (end <= start) {
      alert('Час кінця має бути після часу початку');
      return;
    }

    const eventData: CreateCalendarEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: start,
      endTime: end,
      allDay,
      goalId: goalId || undefined,
      color,
    };

    try {
      setSaving(true);
      await onSave(eventData, isEditing ? event.id : undefined);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Помилка при збереженні події');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !event || !onDelete) return;

    const confirmed = confirm('Ви впевнені, що хочете видалити цю подію?');
    if (!confirmed) return;

    try {
      setDeleting(true);
      await onDelete(event.id);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Помилка при видаленні події');
    } finally {
      setDeleting(false);
    }
  };

  // Get selected goal for color preview
  const selectedGoal = goals.find((g) => g.id === goalId);
  const selectedGoalMeta = selectedGoal ? getCategoryMeta(selectedGoal.category) : null;
  const displayColor = goalId && selectedGoalMeta ? selectedGoalMeta.color : color;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редагувати подію' : 'Нова подія'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Змініть деталі події'
              : 'Додайте нову подію до календаря'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Назва <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Назва події"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис події (опціонально)"
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Місце</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Місце події (опціонально)"
            />
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked === true)}
            />
            <Label htmlFor="allDay" className="cursor-pointer">
              Цілий день
            </Label>
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Дата початку <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  Час початку <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">
                Дата кінця <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime">
                  Час кінця <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Goal Selection */}
          <div className="space-y-2">
            <Label htmlFor="goal">Прив'язати до цілі</Label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть ціль (опціонально)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без цілі</SelectItem>
                {goals.map((goal) => {
                  const meta = getCategoryMeta(goal.category);
                  return (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center gap-2">
                        {goal.iconUrl ? (
                          <img
                            src={goal.iconUrl}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        ) : (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                        )}
                        <span>{goal.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Color Selection (only if no goal selected) */}
          {!goalId && (
            <div className="space-y-2">
              <Label htmlFor="color">Колір</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: c.value }}
                        />
                        <span>{c.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color Preview */}
          <div className="flex items-center gap-2 p-3 rounded-lg border">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: displayColor }}
            />
            <span className="text-sm text-muted-foreground">
              Попередній перегляд кольору події
            </span>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? 'Видалення...' : 'Видалити'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              Скасувати
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? 'Збереження...' : isEditing ? 'Зберегти' : 'Створити'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
