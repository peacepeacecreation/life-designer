/**
 * Глобальні налаштування платформи Life Designer
 *
 * Це централізоване сховище всіх базових налаштувань,
 * які впливають на роботу всієї платформи
 */

/**
 * Робочі години - визначають активний час роботи з платформою
 */
export interface WorkHours {
  /** Початок робочого дня (година 0-23) */
  startHour: number;
  /** Кінець робочого дня (година 0-23) */
  endHour: number;
  /** Робочі дні тижня (0=неділя, 1=понеділок, ..., 6=субота) */
  workDays: number[];
}

/**
 * Налаштування активності та продуктивності
 */
export interface ActivitySettings {
  /** Рекомендована тривалість фокус-сесії (хвилини) */
  focusSessionDuration: number;
  /** Тривалість короткої перерви (хвилини) */
  shortBreakDuration: number;
  /** Тривалість довгої перерви (хвилини) */
  longBreakDuration: number;
  /** Кількість фокус-сесій до довгої перерви */
  sessionsUntilLongBreak: number;
  /** Денна ціль продуктивних годин */
  dailyProductiveHoursGoal: number;
}

/**
 * Налаштування календаря
 */
export interface CalendarSettings {
  /** Перший день тижня (0=неділя, 1=понеділок) */
  firstDayOfWeek: number;
  /** Вид календаря за замовчуванням */
  defaultView: 'month' | 'week' | 'day' | 'agenda';
  /** Показувати вихідні */
  showWeekends: boolean;
  /** Тривалість слоту за замовчуванням при створенні події (хвилини) */
  defaultEventDuration: number;
}

/**
 * Налаштування відображення
 */
export interface DisplaySettings {
  /** Мова інтерфейсу */
  language: 'uk' | 'en';
  /** Часовий пояс */
  timezone: string;
  /** Формат дати */
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  /** Формат часу */
  timeFormat: '12h' | '24h';
}

/**
 * Налаштування нотифікацій
 */
export interface NotificationSettings {
  /** Увімкнути нотифікації про події */
  enableEventReminders: boolean;
  /** За скільки хвилин до події показувати нагадування */
  reminderMinutesBefore: number;
  /** Увімкнути нотифікації про цілі */
  enableGoalReminders: boolean;
  /** Час денного нагадування про цілі (HH:MM) */
  dailyGoalReminderTime: string;
}

/**
 * Головний інтерфейс глобальних налаштувань
 */
export interface GlobalSettings {
  /** Робочі години */
  workHours: WorkHours;
  /** Налаштування активності */
  activity: ActivitySettings;
  /** Налаштування календаря */
  calendar: CalendarSettings;
  /** Налаштування відображення */
  display: DisplaySettings;
  /** Налаштування нотифікацій */
  notifications: NotificationSettings;
  /** Версія налаштувань (для міграцій) */
  version: string;
  /** Дата останнього оновлення */
  lastUpdated: Date;
}

/**
 * Значення за замовчуванням для глобальних налаштувань
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  workHours: {
    startHour: 9,
    endHour: 22,
    workDays: [1, 2, 3, 4, 5], // Пн-Пт
  },
  activity: {
    focusSessionDuration: 50,
    shortBreakDuration: 10,
    longBreakDuration: 30,
    sessionsUntilLongBreak: 4,
    dailyProductiveHoursGoal: 6,
  },
  calendar: {
    firstDayOfWeek: 1, // Понеділок
    defaultView: 'week',
    showWeekends: true,
    defaultEventDuration: 60,
  },
  display: {
    language: 'uk',
    timezone: 'Europe/Kiev',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  notifications: {
    enableEventReminders: true,
    reminderMinutesBefore: 15,
    enableGoalReminders: true,
    dailyGoalReminderTime: '09:00',
  },
  version: '1.0.0',
  lastUpdated: new Date(),
};
