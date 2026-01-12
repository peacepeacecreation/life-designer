/**
 * Calendar Settings Hook
 *
 * Інтегрований з глобальними налаштуваннями платформи.
 * Використовує робочі години з GlobalSettingsContext.
 */

import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { useMemo } from 'react';

export interface CalendarSettings {
  startHour: number; // 0-23
  endHour: number;   // 0-23
  hiddenHours?: { start: number; end: number }[]; // Optional hidden time ranges
}

export function useCalendarSettings() {
  const { settings: globalSettings, updateWorkHours } = useGlobalSettings();

  // Мапимо глобальні налаштування робочих годин до формату CalendarSettings
  const settings: CalendarSettings = useMemo(
    () => ({
      startHour: globalSettings.workHours.startHour,
      endHour: globalSettings.workHours.endHour,
      hiddenHours: [],
    }),
    [globalSettings.workHours]
  );

  // Оновлення налаштувань тепер оновлює глобальні робочі години
  const updateSettings = (newSettings: Partial<CalendarSettings>) => {
    updateWorkHours({
      startHour: newSettings.startHour,
      endHour: newSettings.endHour,
    });
  };

  // Скидання до глобальних значень за замовчуванням
  const resetSettings = () => {
    updateWorkHours({
      startHour: 9,
      endHour: 22,
    });
  };

  // Get min/max Date objects for react-big-calendar
  const getTimeRange = () => {
    const today = new Date();
    const minTime = new Date(today);
    minTime.setHours(settings.startHour, 0, 0, 0);

    const maxTime = new Date(today);
    maxTime.setHours(settings.endHour, 59, 59, 999);

    return { minTime, maxTime };
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    getTimeRange,
  };
}
