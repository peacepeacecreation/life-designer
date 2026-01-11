/**
 * Calendar Settings Hook
 *
 * Manages calendar display settings including work hours
 */

import { useState, useEffect } from 'react';

export interface CalendarSettings {
  startHour: number; // 0-23
  endHour: number;   // 0-23
  hiddenHours?: { start: number; end: number }[]; // Optional hidden time ranges
}

const DEFAULT_SETTINGS: CalendarSettings = {
  startHour: 0,
  endHour: 23,
  hiddenHours: [],
};

const STORAGE_KEY = 'calendar-settings';

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: Partial<CalendarSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving calendar settings:', error);
    }
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
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
