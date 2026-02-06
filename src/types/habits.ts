// Habit Types for Life Designer
// Based on Loop Habit Tracker + Atomic Habits principles

import { GoalCategory } from './goals';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Frequency type - how often the habit should be performed
 */
export enum HabitFrequencyType {
  DAILY = 'daily',           // Щодня
  WEEKLY = 'weekly',         // X разів на тиждень
  MONTHLY = 'monthly',       // X разів на місяць
  INTERVAL = 'interval',     // Кожні X днів
}

/**
 * Tracking type - what kind of data to track
 */
export enum HabitTrackingType {
  BOOLEAN = 'boolean',       // Так/Ні (зробив/не зробив)
  NUMERIC = 'numeric',       // Числове значення (10 віджимань, 2L води)
  DURATION = 'duration',     // Тривалість (30 хвилин медитації)
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Main Habit interface
 */
export interface Habit {
  id: string;
  userId: string;

  // Basic info
  name: string;
  description?: string;
  icon?: string;              // emoji або predefined icon ID
  color?: string;             // hex color, default #3b82f6

  // Frequency configuration
  frequencyType: HabitFrequencyType;
  frequencyCount?: number;    // Скільки разів (для weekly/monthly)
  intervalDays?: number;      // Кожні X днів (для interval)

  // Scheduling
  preferredTime?: string;     // HH:MM format
  reminderEnabled: boolean;
  reminderTime?: string;      // HH:MM format

  // Tracking configuration
  trackingType: HabitTrackingType;
  targetValue?: number;       // Ціль (10 віджимань, 2.0 літрів)
  unit?: string;              // Одиниця виміру ("віджимань", "л", "хв")

  // Integration
  relatedGoalId?: string;     // Link to goal
  category?: GoalCategory;    // Same categories as goals

  // Habit stacking (Atomic Habits)
  cue?: string;               // Тригер ("Після того як прокинусь...")
  reward?: string;            // Нагорода

  // Metadata
  isActive: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Habit completion record
 */
export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;

  // Completion data
  completionDate: Date;       // Date (YYYY-MM-DD)
  completedAt: Date;          // Timestamp

  // Values for non-boolean tracking
  value?: number;             // For numeric type
  durationMinutes?: number;   // For duration type

  // Context
  note?: string;              // User note
  moodScore?: number;         // 1-5 rating

  createdAt: Date;
}

/**
 * Habit streak data (denormalized for performance)
 */
export interface HabitStreak {
  habitId: string;
  userId: string;

  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;

  lastCompletionDate?: Date;
  streakStartDate?: Date;

  updatedAt: Date;
}

/**
 * Habit with streak data (for UI)
 */
export interface HabitWithStreak extends Habit {
  streak?: HabitStreak;
  todayCompleted?: boolean;
  todayCompletion?: HabitCompletion;
}

/**
 * Habit completion rate stats
 */
export interface HabitStats {
  habitId: string;
  completionRate: number;     // Percentage (0-100)
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  weeklyCompletions: number;  // Last 7 days
  monthlyCompletions: number; // Last 30 days
}

/**
 * Habit calendar data (for heatmap)
 */
export interface HabitCalendarData {
  date: string;               // YYYY-MM-DD
  completed: boolean;
  value?: number;             // For numeric/duration tracking
  moodScore?: number;
}

/**
 * Weekly habit summary (for weekly snapshots integration)
 */
export interface WeeklyHabitSummary {
  habitId: string;
  habitName: string;
  completions: number;
  target: number;             // Expected completions this week
  completionRate: number;     // Percentage
  currentStreak: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Habit form data (for creating/editing)
 */
export type HabitFormData = Omit<
  Habit,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

/**
 * Habit update data (partial updates)
 */
export type HabitUpdateData = Partial<HabitFormData>;

/**
 * Completion form data
 */
export type CompletionFormData = Omit<
  HabitCompletion,
  'id' | 'userId' | 'habitId' | 'createdAt' | 'completedAt'
>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Frequency type labels (Ukrainian)
 */
export const frequencyTypeLabels: Record<HabitFrequencyType, string> = {
  [HabitFrequencyType.DAILY]: 'Щодня',
  [HabitFrequencyType.WEEKLY]: 'На тиждень',
  [HabitFrequencyType.MONTHLY]: 'На місяць',
  [HabitFrequencyType.INTERVAL]: 'Кожні X днів',
};

/**
 * Tracking type labels (Ukrainian)
 */
export const trackingTypeLabels: Record<HabitTrackingType, string> = {
  [HabitTrackingType.BOOLEAN]: 'Так/Ні',
  [HabitTrackingType.NUMERIC]: 'Кількість',
  [HabitTrackingType.DURATION]: 'Тривалість',
};

/**
 * Default habit icons by category
 */
export const categoryHabitIcons: Record<GoalCategory, string> = {
  [GoalCategory.WORK_STARTUPS]: '💼',
  [GoalCategory.LEARNING]: '📚',
  [GoalCategory.HEALTH_SPORTS]: '🏃',
  [GoalCategory.HOBBIES]: '🎨',
};

/**
 * Common habit templates
 */
export interface HabitTemplate {
  name: string;
  description: string;
  category: GoalCategory;
  icon: string;
  frequencyType: HabitFrequencyType;
  frequencyCount?: number;
  trackingType: HabitTrackingType;
  targetValue?: number;
  unit?: string;
  cue?: string;
}

export const habitTemplates: HabitTemplate[] = [
  // Health & Sports
  {
    name: 'Ранкова зарядка',
    description: '15 хвилин легких вправ після пробудження',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '🏋️',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 15,
    unit: 'хв',
    cue: 'Після того як прокинусь',
  },
  {
    name: 'Пробіжка',
    description: 'Біг на свіжому повітрі',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '🏃',
    frequencyType: HabitFrequencyType.WEEKLY,
    frequencyCount: 3,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 30,
    unit: 'хв',
  },
  {
    name: 'Пити воду',
    description: 'Підтримувати водний баланс',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '💧',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.NUMERIC,
    targetValue: 2,
    unit: 'л',
  },
  {
    name: '10,000 кроків',
    description: 'Денна активність',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '👟',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.NUMERIC,
    targetValue: 10000,
    unit: 'кроків',
  },
  {
    name: 'Медитація',
    description: 'Практика усвідомленості',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '🧘',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 10,
    unit: 'хв',
    cue: 'Після ранкової кави',
  },

  // Work & Learning
  {
    name: 'Deep work сесія',
    description: 'Сфокусована робота без відволікань',
    category: GoalCategory.WORK_STARTUPS,
    icon: '🎯',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 120,
    unit: 'хв',
  },
  {
    name: 'Читання',
    description: 'Читати книги або статті',
    category: GoalCategory.LEARNING,
    icon: '📖',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 30,
    unit: 'хв',
    cue: 'Перед сном',
  },
  {
    name: 'Вивчення англійської',
    description: 'Практика мови',
    category: GoalCategory.LEARNING,
    icon: '🇬🇧',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 20,
    unit: 'хв',
  },
  {
    name: 'Програмування',
    description: 'Навчання коду або side project',
    category: GoalCategory.LEARNING,
    icon: '💻',
    frequencyType: HabitFrequencyType.WEEKLY,
    frequencyCount: 5,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 60,
    unit: 'хв',
  },

  // Hobbies
  {
    name: 'Малювання',
    description: 'Творча практика',
    category: GoalCategory.HOBBIES,
    icon: '🎨',
    frequencyType: HabitFrequencyType.WEEKLY,
    frequencyCount: 3,
    trackingType: HabitTrackingType.BOOLEAN,
  },
  {
    name: 'Гітара',
    description: 'Музична практика',
    category: GoalCategory.HOBBIES,
    icon: '🎸',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.DURATION,
    targetValue: 30,
    unit: 'хв',
  },
  {
    name: 'Щоденник',
    description: 'Писати про день',
    category: GoalCategory.HOBBIES,
    icon: '📝',
    frequencyType: HabitFrequencyType.DAILY,
    trackingType: HabitTrackingType.BOOLEAN,
    cue: 'Перед сном',
  },

  // Life maintenance
  {
    name: 'Прибирання',
    description: 'Підтримувати порядок',
    category: GoalCategory.HEALTH_SPORTS,
    icon: '🧹',
    frequencyType: HabitFrequencyType.WEEKLY,
    frequencyCount: 1,
    trackingType: HabitTrackingType.BOOLEAN,
  },
  {
    name: 'Планування тижня',
    description: 'Weekly review та планування',
    category: GoalCategory.WORK_STARTUPS,
    icon: '📅',
    frequencyType: HabitFrequencyType.WEEKLY,
    frequencyCount: 1,
    trackingType: HabitTrackingType.BOOLEAN,
  },
];
