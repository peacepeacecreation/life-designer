import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';

export function getSeedGoals(): Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'connections'>[] {
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  return [
    // Робота та Стартапи
    {
      name: 'Розробка MVP для нового стартапу',
      description: 'Створити мінімально життєздатний продукт для Life Designer з основним функціоналом',
      category: GoalCategory.WORK_STARTUPS,
      priority: GoalPriority.CRITICAL,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 20, // годин на тиждень
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // тиждень тому
      targetEndDate: threeMonthsFromNow,
      tags: ['стартап', 'розробка', 'MVP'],
      displayOrder: 0,
    },
    {
      name: 'Основна робота - проекти клієнтів',
      description: 'Робота над поточними клієнтськими проектами',
      category: GoalCategory.WORK_STARTUPS,
      priority: GoalPriority.CRITICAL,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 40,
      startDate: now,
      targetEndDate: sixMonthsFromNow,
      tags: ['робота', 'клієнти'],
      displayOrder: 0,
    },

    // Навчання
    {
      name: 'Вивчення англійської до рівня B2',
      description: 'Щоденні заняття англійською: граматика, словниковий запас, розмовна практика',
      category: GoalCategory.LEARNING,
      priority: GoalPriority.HIGH,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 7, // 1 година щодня
      startDate: now,
      targetEndDate: sixMonthsFromNow,
      tags: ['англійська', 'мови', 'освіта'],
      displayOrder: 0,
    },
    {
      name: 'Курс по TypeScript Advanced',
      description: 'Поглиблене вивчення TypeScript для покращення навичок розробки',
      category: GoalCategory.LEARNING,
      priority: GoalPriority.MEDIUM,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 5,
      startDate: now,
      targetEndDate: oneMonthFromNow,
      tags: ['програмування', 'TypeScript', 'курси'],
      displayOrder: 0,
    },

    // Здоров'я та Спорт
    {
      name: 'Тренування в спортзалі 3 рази на тиждень',
      description: 'Силові тренування для підтримки форми та здоров\'я',
      category: GoalCategory.HEALTH_SPORTS,
      priority: GoalPriority.HIGH,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 4.5, // 3x1.5 години
      startDate: now,
      targetEndDate: sixMonthsFromNow,
      tags: ['спорт', 'здоров\'я', 'фітнес'],
      displayOrder: 0,
    },
    {
      name: 'Ранкова зарядка щодня',
      description: 'Щоденна 20-хвилинна зарядка та розтяжка',
      category: GoalCategory.HEALTH_SPORTS,
      priority: GoalPriority.MEDIUM,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 2.5, // 5 днів x 30 хв
      startDate: now,
      targetEndDate: sixMonthsFromNow,
      tags: ['здоров\'я', 'ранок', 'рутина'],
      displayOrder: 0,
    },

    // Хобі
    {
      name: 'Читання книг по бізнесу та розвитку',
      description: 'Читати мінімум 1 книгу на місяць',
      category: GoalCategory.HOBBIES,
      priority: GoalPriority.LOW,
      status: GoalStatus.IN_PROGRESS,
      timeAllocated: 3, // 3 години на тиждень
      startDate: now,
      targetEndDate: sixMonthsFromNow,
      tags: ['читання', 'саморозвиток', 'книги'],
      displayOrder: 0,
    },
    {
      name: 'Гра на гітарі',
      description: 'Практика гри на гітарі для релаксації',
      category: GoalCategory.HOBBIES,
      priority: GoalPriority.LOW,
      status: GoalStatus.ON_HOLD,
      timeAllocated: 2,
      startDate: now,
      targetEndDate: threeMonthsFromNow,
      tags: ['музика', 'хобі', 'релакс'],
      displayOrder: 0,
    },
  ];
}
