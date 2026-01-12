/**
 * Глобальний контекст налаштувань платформи
 *
 * Надає доступ до всіх базових налаштувань системи
 * та методи для їх оновлення
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  WorkHours,
  ActivitySettings,
  CalendarSettings,
  DisplaySettings,
  NotificationSettings,
} from '@/types/global-settings';

const STORAGE_KEY = 'life-designer-global-settings';

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateWorkHours: (workHours: Partial<WorkHours>) => void;
  updateActivity: (activity: Partial<ActivitySettings>) => void;
  updateCalendar: (calendar: Partial<CalendarSettings>) => void;
  updateDisplay: (display: Partial<DisplaySettings>) => void;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const GlobalSettingsContext = createContext<
  GlobalSettingsContextType | undefined
>(undefined);

interface StorageData {
  settings: GlobalSettings;
  savedAt: string;
}

/**
 * Парсинг дат з JSON
 */
function parseSettingsDates(settings: GlobalSettings): GlobalSettings {
  return {
    ...settings,
    lastUpdated: new Date(settings.lastUpdated),
  };
}

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(
    DEFAULT_GLOBAL_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Завантаження налаштувань з localStorage при монтуванні
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: StorageData = JSON.parse(stored);
          const parsed = parseSettingsDates(data.settings);
          setSettings(parsed);
        }
      } catch (error) {
        console.error('Error loading global settings:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Збереження налаштувань в localStorage при зміні
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        const data: StorageData = {
          settings,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving global settings:', error);
      }
    }
  }, [settings, isLoaded]);

  /**
   * Оновлення робочих годин
   */
  const updateWorkHours = useCallback((updates: Partial<WorkHours>) => {
    setSettings((prev) => ({
      ...prev,
      workHours: { ...prev.workHours, ...updates },
      lastUpdated: new Date(),
    }));
  }, []);

  /**
   * Оновлення налаштувань активності
   */
  const updateActivity = useCallback((updates: Partial<ActivitySettings>) => {
    setSettings((prev) => ({
      ...prev,
      activity: { ...prev.activity, ...updates },
      lastUpdated: new Date(),
    }));
  }, []);

  /**
   * Оновлення налаштувань календаря
   */
  const updateCalendar = useCallback((updates: Partial<CalendarSettings>) => {
    setSettings((prev) => ({
      ...prev,
      calendar: { ...prev.calendar, ...updates },
      lastUpdated: new Date(),
    }));
  }, []);

  /**
   * Оновлення налаштувань відображення
   */
  const updateDisplay = useCallback((updates: Partial<DisplaySettings>) => {
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, ...updates },
      lastUpdated: new Date(),
    }));
  }, []);

  /**
   * Оновлення налаштувань нотифікацій
   */
  const updateNotifications = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, ...updates },
        lastUpdated: new Date(),
      }));
    },
    []
  );

  /**
   * Скидання до значень за замовчуванням
   */
  const resetSettings = useCallback(() => {
    setSettings({
      ...DEFAULT_GLOBAL_SETTINGS,
      lastUpdated: new Date(),
    });
  }, []);

  /**
   * Експорт налаштувань в JSON
   */
  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  /**
   * Імпорт налаштувань з JSON
   */
  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson) as GlobalSettings;
      const parsed = parseSettingsDates(imported);
      setSettings(parsed);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }, []);

  const value: GlobalSettingsContextType = {
    settings,
    updateWorkHours,
    updateActivity,
    updateCalendar,
    updateDisplay,
    updateNotifications,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

/**
 * Хук для доступу до глобальних налаштувань
 */
export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (!context) {
    throw new Error(
      'useGlobalSettings must be used within GlobalSettingsProvider'
    );
  }
  return context;
}
