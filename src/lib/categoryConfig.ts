import { GoalCategory, GoalPriority, GoalStatus, CategoryMeta } from '@/types';

export const categoryMeta: CategoryMeta[] = [
  {
    id: GoalCategory.WORK_STARTUPS,
    name: 'Робота та стартапи',
    description: 'Основна робота та підприємницькі проекти',
    color: '#EF4444', // Червоний - від hsl(0, 84%, 60%)
    icon: '💼',
    examples: ['Основна робота', 'Voice Agent Poland', 'Trading Plan'],
  },
  {
    id: GoalCategory.LEARNING,
    name: 'Навчання',
    description: 'Професійний розвиток та освіта',
    color: '#3B82F6', // Синій - від hsl(221, 83%, 53%)
    icon: '📚',
    examples: ['Англійська мова', 'Курси', 'Читання'],
  },
  {
    id: GoalCategory.HEALTH_SPORTS,
    name: 'Здоров\'я та спорт',
    description: 'Фізична активність та здоров\'я',
    color: '#10B981', // Зелений - від hsl(142, 71%, 45%)
    icon: '💪',
    examples: ['Тренування', 'Харчування', 'Прогулянки'],
  },
  {
    id: GoalCategory.HOBBIES,
    name: 'Хобі та розвиток',
    description: 'Особисті інтереси та творчість',
    color: '#A855F7', // Фіолетовий - від hsl(280, 65%, 60%)
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
  ongoing: 'Постійна',
};

// Helper function to get category meta by id
export function getCategoryMeta(category: GoalCategory): CategoryMeta {
  const meta = categoryMeta.find(c => c.id === category);
  if (!meta) {
    throw new Error(`Category metadata not found for ${category}`);
  }
  return meta;
}
