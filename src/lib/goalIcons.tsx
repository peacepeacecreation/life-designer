import { GoalCategory } from '@/types';
import {
  // Work & Startups
  Briefcase,
  Rocket,
  TrendingUp,
  DollarSign,
  Target,
  // Learning
  BookOpen,
  GraduationCap,
  Brain,
  Lightbulb,
  PenTool,
  // Health & Sports
  Activity,
  Heart,
  Apple,
  Dumbbell,
  Bike,
  // Hobbies
  Palette,
  Music,
  Camera,
  Coffee,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

export interface IconOption {
  id: string;
  name: string;
  Icon: LucideIcon;
  category: GoalCategory;
}

export const goalIcons: IconOption[] = [
  // Work & Startups - 5 icons
  { id: 'briefcase', name: 'Валіза', Icon: Briefcase, category: GoalCategory.WORK_STARTUPS },
  { id: 'rocket', name: 'Ракета', Icon: Rocket, category: GoalCategory.WORK_STARTUPS },
  { id: 'trending-up', name: 'Зростання', Icon: TrendingUp, category: GoalCategory.WORK_STARTUPS },
  { id: 'dollar-sign', name: 'Гроші', Icon: DollarSign, category: GoalCategory.WORK_STARTUPS },
  { id: 'target', name: 'Ціль', Icon: Target, category: GoalCategory.WORK_STARTUPS },

  // Learning - 5 icons
  { id: 'book-open', name: 'Книга', Icon: BookOpen, category: GoalCategory.LEARNING },
  { id: 'graduation-cap', name: 'Освіта', Icon: GraduationCap, category: GoalCategory.LEARNING },
  { id: 'brain', name: 'Мозок', Icon: Brain, category: GoalCategory.LEARNING },
  { id: 'lightbulb', name: 'Ідея', Icon: Lightbulb, category: GoalCategory.LEARNING },
  { id: 'pen-tool', name: 'Письмо', Icon: PenTool, category: GoalCategory.LEARNING },

  // Health & Sports - 5 icons
  { id: 'activity', name: 'Активність', Icon: Activity, category: GoalCategory.HEALTH_SPORTS },
  { id: 'heart', name: 'Здоров\'я', Icon: Heart, category: GoalCategory.HEALTH_SPORTS },
  { id: 'apple', name: 'Харчування', Icon: Apple, category: GoalCategory.HEALTH_SPORTS },
  { id: 'dumbbell', name: 'Тренування', Icon: Dumbbell, category: GoalCategory.HEALTH_SPORTS },
  { id: 'bike', name: 'Спорт', Icon: Bike, category: GoalCategory.HEALTH_SPORTS },

  // Hobbies - 5 icons
  { id: 'palette', name: 'Творчість', Icon: Palette, category: GoalCategory.HOBBIES },
  { id: 'music', name: 'Музика', Icon: Music, category: GoalCategory.HOBBIES },
  { id: 'camera', name: 'Фото', Icon: Camera, category: GoalCategory.HOBBIES },
  { id: 'coffee', name: 'Відпочинок', Icon: Coffee, category: GoalCategory.HOBBIES },
  { id: 'sparkles', name: 'Розваги', Icon: Sparkles, category: GoalCategory.HOBBIES },
];

// Get icons for specific category
export function getIconsByCategory(category: GoalCategory): IconOption[] {
  return goalIcons.filter(icon => icon.category === category);
}

// Get icon by ID
export function getIconById(iconId: string): IconOption | undefined {
  return goalIcons.find(icon => icon.id === iconId);
}

// Check if iconUrl is a predefined icon ID
export function isPredefinedIcon(iconUrl: string): boolean {
  return goalIcons.some(icon => icon.id === iconUrl);
}
