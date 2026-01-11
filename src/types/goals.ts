// Goal Categories aligned with user's life areas
export enum GoalCategory {
  WORK_STARTUPS = 'work_startups',     // Робота та стартапи
  LEARNING = 'learning',                // Навчання
  HEALTH_SPORTS = 'health_sports',      // Здоров'я та спорт
  HOBBIES = 'hobbies',                  // Хобі та розвиток
}

// Goal Priority levels for time allocation decisions
export enum GoalPriority {
  CRITICAL = 'critical',    // Критичний (основна робота, здоров'я)
  HIGH = 'high',            // Високий (стартапи, англійська)
  MEDIUM = 'medium',        // Середній (додаткове навчання)
  LOW = 'low',              // Низький (хобі коли є час)
}

// Goal status for progress tracking
export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// Connection types between goals
export enum GoalConnectionType {
  DEPENDS_ON = 'depends_on',        // Ціль А потребує Ціль Б спочатку
  SYNERGY = 'synergy',              // Цілі підсилюють одна одну
  CONFLICT = 'conflict',            // Цілі конкурують за ресурси
  CONTRIBUTES_TO = 'contributes_to', // Ціль А допомагає досягти Ціль Б
}

// Main Goal interface
export interface Goal {
  id: string;
  name: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;

  // Time allocation (hours per week)
  timeAllocated: number;

  // Timeline
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;

  // Progress tracking
  progressPercentage: number; // 0-100

  // Connections to other goals
  connections: GoalConnection[];

  // Tags for filtering/grouping
  tags: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalConnection {
  id: string;
  fromGoalId: string;
  toGoalId: string;
  type: GoalConnectionType;
  strength: number; // 1-10, how strong the connection is
  description?: string;
}

// Category metadata for UI customization
export interface CategoryMeta {
  id: GoalCategory;
  name: string;           // Ukrainian name
  description: string;
  color: string;          // HSL color for visualization
  icon: string;          // Emoji or icon identifier
  examples: string[];    // Example goals for this category
}
