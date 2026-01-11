import { GoalCategory, GoalPriority, GoalStatus, CategoryMeta } from '@/types';

export const categoryMeta: CategoryMeta[] = [
  {
    id: GoalCategory.WORK_STARTUPS,
    name: 'Робота та стартапи',
    description: 'Основна робота та підприємницькі проекти',
    color: 'hsl(var(--goal-work))',
    icon: '💼',
    examples: ['Основна робота', 'Voice Agent Poland', 'Trading Plan'],
  },
  {
    id: GoalCategory.LEARNING,
    name: 'Навчання',
    description: 'Професійний розвиток та освіта',
    color: 'hsl(var(--goal-learning))',
    icon: '📚',
    examples: ['Англійська мова', 'Курси', 'Читання'],
  },
  {
    id: GoalCategory.HEALTH_SPORTS,
    name: 'Здоров\'я та спорт',
    description: 'Фізична активність та здоров\'я',
    color: 'hsl(var(--goal-health))',
    icon: '💪',
    examples: ['Тренування', 'Харчування', 'Прогулянки'],
  },
  {
    id: GoalCategory.HOBBIES,
    name: 'Хобі та розвиток',
    description: 'Особисті інтереси та творчість',
    color: 'hsl(var(--goal-hobbies))',
    icon: '🎨',
    examples: ['Музика', 'Трейдинг (навчання)', 'Фотографія'],
  },
];

export const priorityLabels: Record<GoalPriority, string> = {
  critical: 'Критичний',
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький',
};

export const statusLabels: Record<GoalStatus, string> = {
  not_started: 'Не розпочато',
  in_progress: 'В процесі',
  on_hold: 'Призупинено',
  completed: 'Завершено',
  abandoned: 'Скасовано',
};

// Helper function to get category meta by id
export function getCategoryMeta(category: GoalCategory): CategoryMeta {
  const meta = categoryMeta.find(c => c.id === category);
  if (!meta) {
    throw new Error(`Category metadata not found for ${category}`);
  }
  return meta;
}
