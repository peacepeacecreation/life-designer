/**
 * Embedding Service
 *
 * High-level service for generating embeddings for different content types.
 * Combines OpenAI client with content formatters for a clean API.
 *
 * Usage:
 *   const service = getEmbeddingService();
 *   const embedding = await service.generateGoalEmbedding(goal);
 */

import { getEmbeddingsClient } from './openai-client';
import {
  formatGoalForEmbedding,
  formatNoteForEmbedding,
  formatReflectionForEmbedding,
  formatHabitForEmbedding,
  truncateForEmbedding,
} from './content-formatter';
import { Goal } from '@/types/goals';
import { Note } from '@/types/notes';
import { Reflection } from '@/types/reflections';
import { Habit } from '@/types/habits';

export class EmbeddingService {
  private client = getEmbeddingsClient();

  /**
   * Generate embedding for a Goal
   *
   * @param goal - Goal object (can be partial for create operations)
   * @returns Embedding vector (1536 dimensions)
   */
  async generateGoalEmbedding(goal: Goal | Partial<Goal>): Promise<number[]> {
    const content = truncateForEmbedding(formatGoalForEmbedding(goal));
    const response = await this.client.generateEmbedding(content);
    return response.embedding;
  }

  /**
   * Generate embedding for a Note
   *
   * @param note - Note object (can be partial for create operations)
   * @returns Embedding vector (1536 dimensions)
   */
  async generateNoteEmbedding(note: Note | Partial<Note>): Promise<number[]> {
    const content = truncateForEmbedding(formatNoteForEmbedding(note));
    const response = await this.client.generateEmbedding(content);
    return response.embedding;
  }

  /**
   * Generate embedding for a Reflection
   *
   * @param reflection - Reflection object (can be partial for create operations)
   * @returns Embedding vector (1536 dimensions)
   */
  async generateReflectionEmbedding(reflection: Reflection | Partial<Reflection>): Promise<number[]> {
    const content = truncateForEmbedding(formatReflectionForEmbedding(reflection));
    const response = await this.client.generateEmbedding(content);
    return response.embedding;
  }

  /**
   * Generate embedding for a Habit
   *
   * @param habit - Habit object (can be partial for create operations)
   * @returns Embedding vector (1536 dimensions)
   */
  async generateHabitEmbedding(habit: Habit | Partial<Habit>): Promise<number[]> {
    const content = truncateForEmbedding(formatHabitForEmbedding(habit));
    const response = await this.client.generateEmbedding(content);
    return response.embedding;
  }

  /**
   * Generate embedding for search query
   * Uses the same model as content embeddings for compatibility
   *
   * @param query - Search query text
   * @returns Embedding vector (1536 dimensions)
   */
  async generateSearchQueryEmbedding(query: string): Promise<number[]> {
    return await this.client.generateQueryEmbedding(query);
  }

  /**
   * Generate embeddings for multiple goals in batch
   * More efficient than generating individually
   *
   * @param goals - Array of Goal objects
   * @returns Array of embedding vectors
   */
  async generateGoalEmbeddingsBatch(goals: (Goal | Partial<Goal>)[]): Promise<number[][]> {
    const texts = goals.map(goal =>
      truncateForEmbedding(formatGoalForEmbedding(goal))
    );
    const responses = await this.client.generateEmbeddingsBatch(texts);
    return responses.map(response => response.embedding);
  }

  /**
   * Generate embeddings for multiple notes in batch
   *
   * @param notes - Array of Note objects
   * @returns Array of embedding vectors
   */
  async generateNoteEmbeddingsBatch(notes: (Note | Partial<Note>)[]): Promise<number[][]> {
    const texts = notes.map(note =>
      truncateForEmbedding(formatNoteForEmbedding(note))
    );
    const responses = await this.client.generateEmbeddingsBatch(texts);
    return responses.map(response => response.embedding);
  }

  /**
   * Generate embeddings for multiple reflections in batch
   *
   * @param reflections - Array of Reflection objects
   * @returns Array of embedding vectors
   */
  async generateReflectionEmbeddingsBatch(
    reflections: (Reflection | Partial<Reflection>)[]
  ): Promise<number[][]> {
    const texts = reflections.map(reflection =>
      truncateForEmbedding(formatReflectionForEmbedding(reflection))
    );
    const responses = await this.client.generateEmbeddingsBatch(texts);
    return responses.map(response => response.embedding);
  }

  /**
   * Generate embeddings for multiple habits in batch
   *
   * @param habits - Array of Habit objects
   * @returns Array of embedding vectors
   */
  async generateHabitEmbeddingsBatch(habits: (Habit | Partial<Habit>)[]): Promise<number[][]> {
    const texts = habits.map(habit =>
      truncateForEmbedding(formatHabitForEmbedding(habit))
    );
    const responses = await this.client.generateEmbeddingsBatch(texts);
    return responses.map(response => response.embedding);
  }

  /**
   * Check if content needs embedding regeneration
   * Returns true if key fields that affect embeddings have changed
   *
   * @param type - Content type ('goal' | 'note' | 'reflection')
   * @param updates - Update object
   * @returns true if embedding should be regenerated
   */
  needsEmbeddingRegeneration(
    type: 'goal' | 'note' | 'reflection' | 'habit',
    updates: Partial<Goal> | Partial<Note> | Partial<Reflection> | Partial<Habit>
  ): boolean {
    // Fields that affect embeddings
    const goalFields = ['name', 'description', 'category', 'priority', 'status', 'tags'];
    const noteFields = ['title', 'content', 'noteType', 'category', 'tags'];
    const reflectionFields = ['title', 'content', 'reflectionType', 'moodScore', 'energyLevel', 'tags'];
    const habitFields = ['name', 'description', 'category', 'frequencyType', 'trackingType', 'cue', 'reward'];

    let relevantFields: string[];
    switch (type) {
      case 'goal':
        relevantFields = goalFields;
        break;
      case 'note':
        relevantFields = noteFields;
        break;
      case 'reflection':
        relevantFields = reflectionFields;
        break;
      case 'habit':
        relevantFields = habitFields;
        break;
      default:
        return false;
    }

    // Check if any relevant field is being updated
    return relevantFields.some(field => field in updates);
  }
}

// Singleton instance for reuse across requests
let cachedEmbeddingService: EmbeddingService | null = null;

/**
 * Get or create singleton embedding service
 * Reuses the same service instance across the application
 *
 * @returns Cached embedding service
 */
export function getEmbeddingService(): EmbeddingService {
  if (!cachedEmbeddingService) {
    cachedEmbeddingService = new EmbeddingService();
  }
  return cachedEmbeddingService;
}

/**
 * Reset the cached embedding service
 * Useful for testing
 */
export function resetEmbeddingService(): void {
  cachedEmbeddingService = null;
}

// Export singleton instance as default export
export const embeddingService = getEmbeddingService();
