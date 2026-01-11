/**
 * Reflections Types
 * Type definitions for personal reflections feature
 */

// Reflection type/frequency
export enum ReflectionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

// Main Reflection interface
export interface Reflection {
  id: string;
  userId: string;
  title: string;
  content: string; // Markdown supported
  reflectionDate: Date;
  reflectionType: ReflectionType;
  moodScore?: number; // 1-10 (1 = terrible, 10 = excellent)
  energyLevel?: number; // 1-10 (1 = exhausted, 10 = energized)
  relatedGoalIds: string[];
  relatedNoteIds: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Reflection create/update DTOs
export type CreateReflectionInput = Omit<Reflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateReflectionInput = Partial<CreateReflectionInput>;

// Reflection type metadata for UI customization
export interface ReflectionTypeMeta {
  id: ReflectionType;
  name: string; // Ukrainian name
  description: string;
  icon: string; // Emoji or icon identifier
  color: string; // CSS color for visualization
}

// Reflection type metadata (for UI)
export const reflectionTypeMeta: ReflectionTypeMeta[] = [
  {
    id: ReflectionType.DAILY,
    name: 'Щоденна',
    description: 'Щоденна рефлексія',
    icon: '🌅',
    color: 'hsl(200, 100%, 50%)',
  },
  {
    id: ReflectionType.WEEKLY,
    name: 'Тижнева',
    description: 'Рефлексія за тиждень',
    icon: '📅',
    color: 'hsl(220, 100%, 50%)',
  },
  {
    id: ReflectionType.MONTHLY,
    name: 'Місячна',
    description: 'Рефлексія за місяць',
    icon: '🗓️',
    color: 'hsl(260, 100%, 50%)',
  },
  {
    id: ReflectionType.QUARTERLY,
    name: 'Квартальна',
    description: 'Рефлексія за квартал',
    icon: '📊',
    color: 'hsl(280, 100%, 50%)',
  },
  {
    id: ReflectionType.YEARLY,
    name: 'Річна',
    description: 'Рефлексія за рік',
    icon: '🎯',
    color: 'hsl(320, 100%, 50%)',
  },
  {
    id: ReflectionType.CUSTOM,
    name: 'Довільна',
    description: 'Довільна рефлексія',
    icon: '✨',
    color: 'hsl(45, 100%, 50%)',
  },
];

// Helper function to get reflection type metadata
export function getReflectionTypeMeta(type: ReflectionType): ReflectionTypeMeta {
  return reflectionTypeMeta.find(meta => meta.id === type) || reflectionTypeMeta[0];
}

// Helper function for mood score labels
export function getMoodLabel(score: number): string {
  if (score <= 2) return 'Дуже погано';
  if (score <= 4) return 'Погано';
  if (score <= 6) return 'Нормально';
  if (score <= 8) return 'Добре';
  return 'Чудово';
}

// Helper function for energy level labels
export function getEnergyLabel(level: number): string {
  if (level <= 2) return 'Виснажений';
  if (level <= 4) return 'Втомлений';
  if (level <= 6) return 'Нормальний';
  if (level <= 8) return 'Енергійний';
  return 'Повний енергії';
}
