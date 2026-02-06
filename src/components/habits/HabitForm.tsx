'use client';

import { useState, useEffect } from 'react';
import { useHabits } from '@/contexts/HabitsContext';
import { useGoals } from '@/contexts/GoalsContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  HabitFrequencyType,
  HabitTrackingType,
  habitTemplates,
} from '@/types/habits';
import { GoalCategory } from '@/types/goals';
import { getCategoryMeta } from '@/lib/categoryConfig';

interface HabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  habitId?: string; // For editing
}

export default function HabitForm({
  isOpen,
  onClose,
  habitId,
}: HabitFormProps) {
  const { addHabit, updateHabit, habits } = useHabits();
  const { goals } = useGoals();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('✓');
  const [color, setColor] = useState('#3b82f6');
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>(
    HabitFrequencyType.DAILY
  );
  const [frequencyCount, setFrequencyCount] = useState(1);
  const [intervalDays, setIntervalDays] = useState(1);
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(
    HabitTrackingType.BOOLEAN
  );
  const [targetValue, setTargetValue] = useState<number | undefined>();
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<GoalCategory | undefined>();
  const [relatedGoalId, setRelatedGoalId] = useState<string | undefined>();
  const [cue, setCue] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load habit data if editing
  useEffect(() => {
    if (habitId && isOpen) {
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        setName(habit.name);
        setDescription(habit.description || '');
        setIcon(habit.icon || '✓');
        setColor(habit.color || '#3b82f6');
        setFrequencyType(habit.frequencyType);
        setFrequencyCount(habit.frequencyCount || 1);
        setIntervalDays(habit.intervalDays || 1);
        setTrackingType(habit.trackingType);
        setTargetValue(habit.targetValue);
        setUnit(habit.unit || '');
        setCategory(habit.category);
        setRelatedGoalId(habit.relatedGoalId);
        setCue(habit.cue || '');
        setReminderEnabled(habit.reminderEnabled);
        setReminderTime(habit.reminderTime || '07:00');
      }
    }
  }, [habitId, isOpen, habits]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setName('');
        setDescription('');
        setIcon('✓');
        setColor('#3b82f6');
        setFrequencyType(HabitFrequencyType.DAILY);
        setFrequencyCount(1);
        setIntervalDays(1);
        setTrackingType(HabitTrackingType.BOOLEAN);
        setTargetValue(undefined);
        setUnit('');
        setCategory(undefined);
        setRelatedGoalId(undefined);
        setCue('');
        setReminderEnabled(false);
        setReminderTime('07:00');
        setShowTemplates(false);
      }, 200);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Будь ласка, введіть назву звички');
      return;
    }

    try {
      setIsSubmitting(true);

      const habitData: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon || undefined,
        color: color || undefined,
        frequencyType,
        frequencyCount:
          frequencyType === HabitFrequencyType.WEEKLY ||
          frequencyType === HabitFrequencyType.MONTHLY
            ? frequencyCount
            : undefined,
        intervalDays:
          frequencyType === HabitFrequencyType.INTERVAL
            ? intervalDays
            : undefined,
        trackingType,
        targetValue:
          trackingType !== HabitTrackingType.BOOLEAN
            ? targetValue
            : undefined,
        unit: trackingType !== HabitTrackingType.BOOLEAN ? unit : undefined,
        category: category || undefined,
        relatedGoalId: relatedGoalId || undefined,
        cue: cue.trim() || undefined,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
      };

      if (habitId) {
        await updateHabit(habitId, habitData);
      } else {
        await addHabit(habitData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving habit:', error);
      alert('Помилка при збереженні звички. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateSelect = (templateIndex: number) => {
    const template = habitTemplates[templateIndex];
    setName(template.name);
    setDescription(template.description);
    setIcon(template.icon);
    setCategory(template.category);
    setFrequencyType(template.frequencyType);
    setFrequencyCount(template.frequencyCount || 1);
    setTrackingType(template.trackingType);
    setTargetValue(template.targetValue);
    setUnit(template.unit || '');
    setCue(template.cue || '');
    setShowTemplates(false);
  };

  // Common icons
  const commonIcons = [
    '✓',
    '💪',
    '🏃',
    '🧘',
    '💧',
    '📚',
    '💻',
    '🎯',
    '🔥',
    '🎨',
    '🎸',
    '📝',
    '🧹',
    '📅',
    '☕',
    '🍎',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {habitId ? 'Редагувати звичку' : 'Створити звичку'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Templates (only when creating) */}
          {!habitId && !showTemplates && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTemplates(true)}
              className="w-full"
            >
              🚀 Швидкий старт з шаблону
            </Button>
          )}

          {showTemplates && (
            <div className="space-y-2">
              <Label>Виберіть шаблон:</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {habitTemplates.map((template, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    onClick={() => handleTemplateSelect(index)}
                    className="justify-start h-auto py-2"
                  >
                    <span className="mr-2">{template.icon}</span>
                    <span className="text-sm">{template.name}</span>
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                Створити з нуля ↓
              </Button>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Назва звички <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ранкова зарядка"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис (опціонально)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="15 хвилин легких вправ після пробудження"
              rows={2}
            />
          </div>

          {/* Icon and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Іконка</Label>
              <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-24 overflow-y-auto">
                {commonIcons.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`text-2xl p-1 rounded hover:bg-muted transition-colors ${
                      icon === emoji ? 'bg-primary/20' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Колір</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Frequency Type */}
          <div className="space-y-3">
            <Label>
              Як часто? <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={frequencyType}
              onValueChange={(value) =>
                setFrequencyType(value as HabitFrequencyType)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitFrequencyType.DAILY}
                  id="freq-daily"
                />
                <Label htmlFor="freq-daily" className="font-normal">
                  Щодня
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitFrequencyType.WEEKLY}
                  id="freq-weekly"
                />
                <Label htmlFor="freq-weekly" className="font-normal flex-1">
                  <div className="flex items-center gap-2">
                    <span>X разів на тиждень →</span>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={frequencyCount}
                      onChange={(e) =>
                        setFrequencyCount(parseInt(e.target.value) || 1)
                      }
                      className="w-20 h-8"
                      disabled={frequencyType !== HabitFrequencyType.WEEKLY}
                    />
                    <span>разів</span>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitFrequencyType.INTERVAL}
                  id="freq-interval"
                />
                <Label htmlFor="freq-interval" className="font-normal flex-1">
                  <div className="flex items-center gap-2">
                    <span>Кожні X днів →</span>
                    <Input
                      type="number"
                      min="1"
                      value={intervalDays}
                      onChange={(e) =>
                        setIntervalDays(parseInt(e.target.value) || 1)
                      }
                      className="w-20 h-8"
                      disabled={frequencyType !== HabitFrequencyType.INTERVAL}
                    />
                    <span>днів</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tracking Type */}
          <div className="space-y-3">
            <Label>Що відстежувати?</Label>
            <RadioGroup
              value={trackingType}
              onValueChange={(value) =>
                setTrackingType(value as HabitTrackingType)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitTrackingType.BOOLEAN}
                  id="track-boolean"
                />
                <Label htmlFor="track-boolean" className="font-normal">
                  Так/Ні (зробив чи ні)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitTrackingType.NUMERIC}
                  id="track-numeric"
                />
                <Label htmlFor="track-numeric" className="font-normal">
                  Кількість (10 віджимань, 2л води)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value={HabitTrackingType.DURATION}
                  id="track-duration"
                />
                <Label htmlFor="track-duration" className="font-normal">
                  Тривалість (30 хвилин)
                </Label>
              </div>
            </RadioGroup>

            {/* Target Value and Unit (for numeric/duration) */}
            {trackingType !== HabitTrackingType.BOOLEAN && (
              <div className="grid grid-cols-2 gap-3 mt-3 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="targetValue">Ціль</Label>
                  <Input
                    id="targetValue"
                    type="number"
                    step="0.1"
                    value={targetValue || ''}
                    onChange={(e) =>
                      setTargetValue(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="2.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Одиниця</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={
                      trackingType === HabitTrackingType.DURATION ? 'хв' : 'л'
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Категорія (опціонально)</Label>
            <Select
              value={category || 'none'}
              onValueChange={(value) =>
                setCategory(value === 'none' ? undefined : (value as GoalCategory))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Виберіть категорію" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категорії</SelectItem>
                <SelectItem value={GoalCategory.WORK_STARTUPS}>
                  {getCategoryMeta(GoalCategory.WORK_STARTUPS).name}
                </SelectItem>
                <SelectItem value={GoalCategory.LEARNING}>
                  {getCategoryMeta(GoalCategory.LEARNING).name}
                </SelectItem>
                <SelectItem value={GoalCategory.HEALTH_SPORTS}>
                  {getCategoryMeta(GoalCategory.HEALTH_SPORTS).name}
                </SelectItem>
                <SelectItem value={GoalCategory.HOBBIES}>
                  {getCategoryMeta(GoalCategory.HOBBIES).name}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Related Goal */}
          {goals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="relatedGoal">Прив'язати до цілі? (опціонально)</Label>
              <Select
                value={relatedGoalId || 'none'}
                onValueChange={(value) =>
                  setRelatedGoalId(value === 'none' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Виберіть ціль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без прив'язки</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cue (Habit Stacking) */}
          <div className="space-y-2">
            <Label htmlFor="cue">Тригер - habit stacking (опціонально)</Label>
            <Input
              id="cue"
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              placeholder="Після того як прокинусь..."
            />
            <p className="text-xs text-muted-foreground">
              💡 Прив'яжіть звичку до існуючої рутини для кращого запам'ятовування
            </p>
          </div>

          {/* Reminders */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={(checked) =>
                  setReminderEnabled(checked as boolean)
                }
              />
              <Label htmlFor="reminder" className="font-normal">
                Увімкнути нагадування
              </Label>
            </div>

            {reminderEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="reminderTime">Час нагадування</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Скасувати
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting
              ? 'Збереження...'
              : habitId
              ? 'Зберегти зміни'
              : 'Створити звичку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
