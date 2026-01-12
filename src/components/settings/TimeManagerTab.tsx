'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Clock, Sun, Moon, Coffee, Zap, RotateCcw, Save } from 'lucide-react';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TimeManagerTab() {
  const { settings, updateWorkHours, updateActivity } = useGlobalSettings();

  // Локальний стейт для форми
  const [startHour, setStartHour] = useState(settings.workHours.startHour);
  const [endHour, setEndHour] = useState(settings.workHours.endHour);
  const [focusSession, setFocusSession] = useState(settings.activity.focusSessionDuration);
  const [shortBreak, setShortBreak] = useState(settings.activity.shortBreakDuration);
  const [longBreak, setLongBreak] = useState(settings.activity.longBreakDuration);
  const [productiveHours, setProductiveHours] = useState(settings.activity.dailyProductiveHoursGoal);
  const [hasChanges, setHasChanges] = useState(false);

  // Синхронізація з глобальними налаштуваннями
  useEffect(() => {
    setStartHour(settings.workHours.startHour);
    setEndHour(settings.workHours.endHour);
    setFocusSession(settings.activity.focusSessionDuration);
    setShortBreak(settings.activity.shortBreakDuration);
    setLongBreak(settings.activity.longBreakDuration);
    setProductiveHours(settings.activity.dailyProductiveHoursGoal);
    setHasChanges(false);
  }, [settings]);

  // Трекінг змін
  useEffect(() => {
    const changed =
      startHour !== settings.workHours.startHour ||
      endHour !== settings.workHours.endHour ||
      focusSession !== settings.activity.focusSessionDuration ||
      shortBreak !== settings.activity.shortBreakDuration ||
      longBreak !== settings.activity.longBreakDuration ||
      productiveHours !== settings.activity.dailyProductiveHoursGoal;
    setHasChanges(changed);
  }, [startHour, endHour, focusSession, shortBreak, longBreak, productiveHours, settings]);

  const handleSave = () => {
    if (startHour >= endHour) {
      alert('Початкова година має бути меншою за кінцеву');
      return;
    }

    updateWorkHours({ startHour, endHour });
    updateActivity({
      focusSessionDuration: focusSession,
      shortBreakDuration: shortBreak,
      longBreakDuration: longBreak,
      dailyProductiveHoursGoal: productiveHours,
    });

    setHasChanges(false);
  };

  const handleReset = () => {
    setStartHour(9);
    setEndHour(22);
    setFocusSession(50);
    setShortBreak(10);
    setLongBreak(30);
    setProductiveHours(6);
  };

  // Генерація опцій годин
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`,
  }));

  const totalWorkHours = endHour - startHour;

  return (
    <div className="space-y-6">
      {/* Робочі години */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Режим дня
          </CardTitle>
          <CardDescription>
            Налаштуйте ваш робочий день. Ці години будуть використовуватись у календарі та плануванні активностей.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Початок робочого дня */}
            <div className="space-y-2">
              <Label htmlFor="start-hour" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Початок робочого дня
              </Label>
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
                Час, коли ви звичайно починаєте працювати
              </p>
            </div>

            {/* Кінець робочого дня */}
            <div className="space-y-2">
              <Label htmlFor="end-hour" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Кінець робочого дня
              </Label>
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
                Час, коли ви завершуєте роботу
              </p>
            </div>

            {/* Підсумок робочого дня */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Загальна тривалість
              </Label>
              <div className="px-3 py-2.5 rounded-md border-2 border-blue-400 dark:border-blue-600 bg-blue-100/50 dark:bg-blue-900/10 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-semibold text-blue-500 dark:text-blue-400">
                    {totalWorkHours}
                  </span>
                  <span className="text-sm text-blue-500/70 dark:text-blue-400/70">годин</span>
                </div>
                <p className="text-xs text-blue-500/70 dark:text-blue-400/70">
                  {startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:00
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Налаштування продуктивності */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Налаштування продуктивності
          </CardTitle>
          <CardDescription>
            Тривалість фокус-сесій та перерв для оптимальної продуктивності
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Фокус-сесія */}
            <div className="space-y-2">
              <Label htmlFor="focus-session" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Фокус-сесія (хвилини)
              </Label>
              <Input
                id="focus-session"
                type="number"
                min="15"
                max="120"
                value={focusSession}
                onChange={(e) => setFocusSession(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">
                Рекомендовано: 50-60 хвилин
              </p>
            </div>

            {/* Коротка перерва */}
            <div className="space-y-2">
              <Label htmlFor="short-break" className="flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Коротка перерва (хвилини)
              </Label>
              <Input
                id="short-break"
                type="number"
                min="5"
                max="30"
                value={shortBreak}
                onChange={(e) => setShortBreak(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">
                Рекомендовано: 10-15 хвилин
              </p>
            </div>

            {/* Довга перерва */}
            <div className="space-y-2">
              <Label htmlFor="long-break" className="flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Довга перерва (хвилини)
              </Label>
              <Input
                id="long-break"
                type="number"
                min="15"
                max="60"
                value={longBreak}
                onChange={(e) => setLongBreak(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Рекомендовано: 20-30 хвилин
              </p>
            </div>

            {/* Денна ціль */}
            <div className="space-y-2">
              <Label htmlFor="productive-hours">
                Денна ціль продуктивних годин
              </Label>
              <Input
                id="productive-hours"
                type="number"
                min="1"
                max="12"
                value={productiveHours}
                onChange={(e) => setProductiveHours(parseInt(e.target.value) || 6)}
              />
              <p className="text-xs text-muted-foreground">
                Скільки годин активної роботи на день
              </p>
            </div>
          </div>

          <Separator />

          {/* Кнопки дій */}
          <div className="flex justify-between items-center">
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Скинути до за замовчуванням
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {hasChanges ? 'Зберегти зміни' : 'Збережено'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
