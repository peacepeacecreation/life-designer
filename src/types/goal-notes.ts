/**
 * Goal Notes Types
 *
 * Types for the goal notes feature
 */

export interface GoalNote {
  id: string;
  goalId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalNoteInput {
  goalId: string;
  content: string;
}

export interface UpdateGoalNoteInput {
  content: string;
}
