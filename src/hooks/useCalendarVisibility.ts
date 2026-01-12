import { useState, useEffect } from 'react';
import { GoalCategory } from '@/types/goals';

interface CalendarVisibilitySettings {
  showRecurringEvents: boolean;
  hiddenGoalIds: string[];
  hiddenCategories: GoalCategory[];
}

const DEFAULT_SETTINGS: CalendarVisibilitySettings = {
  showRecurringEvents: false, // За замовчуванням повторювані події приховані
  hiddenGoalIds: [],
  hiddenCategories: [],
};

const STORAGE_KEY = 'calendarVisibility';

export function useCalendarVisibility() {
  const [settings, setSettings] = useState<CalendarVisibilitySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading calendar visibility settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Зберігаємо налаштування при зміні
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving calendar visibility settings:', error);
      }
    }
  }, [settings]);

  const toggleRecurringEvents = () => {
    setSettings((prev) => ({
      ...prev,
      showRecurringEvents: !prev.showRecurringEvents,
    }));
  };

  const toggleGoalVisibility = (goalId: string) => {
    setSettings((prev) => {
      const isHidden = prev.hiddenGoalIds.includes(goalId);
      return {
        ...prev,
        hiddenGoalIds: isHidden
          ? prev.hiddenGoalIds.filter((id) => id !== goalId)
          : [...prev.hiddenGoalIds, goalId],
      };
    });
  };

  const toggleCategoryVisibility = (category: GoalCategory) => {
    setSettings((prev) => {
      const isHidden = prev.hiddenCategories.includes(category);
      return {
        ...prev,
        hiddenCategories: isHidden
          ? prev.hiddenCategories.filter((c) => c !== category)
          : [...prev.hiddenCategories, category],
      };
    });
  };

  const isGoalVisible = (goalId?: string, category?: GoalCategory): boolean => {
    // Якщо goalId прихований явно - не показувати
    if (goalId && settings.hiddenGoalIds.includes(goalId)) {
      return false;
    }

    // Якщо категорія прихована - не показувати
    if (category && settings.hiddenCategories.includes(category)) {
      return false;
    }

    return true;
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    showRecurringEvents: settings.showRecurringEvents,
    hiddenGoalIds: settings.hiddenGoalIds,
    hiddenCategories: settings.hiddenCategories,
    toggleRecurringEvents,
    toggleGoalVisibility,
    toggleCategoryVisibility,
    isGoalVisible,
    resetSettings,
  };
}
