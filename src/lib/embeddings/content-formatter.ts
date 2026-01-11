/**
 * Content Formatters for Embeddings
 *
 * Formats different content types (Goals, Notes, Reflections) into text
 * optimized for semantic search embeddings.
 *
 * Strategy: Combine title, description, and key metadata into a single string
 * with clear structure for better semantic understanding.
 */

import { Goal } from '@/types/goals';
import { Note } from '@/types/notes';
import { Reflection } from '@/types/reflections';

/**
 * Format a Goal for embedding generation
 * Combines name, description, category, priority, status, and tags
 *
 * @param goal - Goal object to format
 * @returns Formatted text string
 */
export function formatGoalForEmbedding(goal: Goal | Partial<Goal>): string {
  const parts: string[] = [];

  if (goal.name) {
    parts.push(`Title: ${goal.name}`);
  }

  if (goal.description) {
    parts.push(`Description: ${goal.description}`);
  }

  if (goal.category) {
    parts.push(`Category: ${goal.category.replace('_', ' ')}`);
  }

  if (goal.priority) {
    parts.push(`Priority: ${goal.priority}`);
  }

  if (goal.status) {
    parts.push(`Status: ${goal.status.replace('_', ' ')}`);
  }

  if (goal.tags && goal.tags.length > 0) {
    parts.push(`Tags: ${goal.tags.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Format a Note for embedding generation
 * Combines title, content, type, category, and tags
 *
 * @param note - Note object to format
 * @returns Formatted text string
 */
export function formatNoteForEmbedding(note: Note | Partial<Note>): string {
  const parts: string[] = [];

  if (note.title) {
    parts.push(`Title: ${note.title}`);
  }

  if (note.content) {
    parts.push(`Content: ${note.content}`);
  }

  if (note.noteType) {
    parts.push(`Type: ${note.noteType}`);
  }

  if (note.category) {
    parts.push(`Category: ${note.category}`);
  }

  if (note.tags && note.tags.length > 0) {
    parts.push(`Tags: ${note.tags.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Format a Reflection for embedding generation
 * Combines title, content, type, date, mood, and tags
 *
 * @param reflection - Reflection object to format
 * @returns Formatted text string
 */
export function formatReflectionForEmbedding(reflection: Reflection | Partial<Reflection>): string {
  const parts: string[] = [];

  if (reflection.title) {
    parts.push(`Title: ${reflection.title}`);
  }

  if (reflection.content) {
    parts.push(`Content: ${reflection.content}`);
  }

  if (reflection.reflectionType) {
    parts.push(`Type: ${reflection.reflectionType}`);
  }

  if (reflection.reflectionDate) {
    const date = reflection.reflectionDate instanceof Date
      ? reflection.reflectionDate
      : new Date(reflection.reflectionDate);
    parts.push(`Date: ${date.toISOString().split('T')[0]}`);
  }

  if (reflection.moodScore) {
    parts.push(`Mood: ${reflection.moodScore}/10`);
  }

  if (reflection.energyLevel) {
    parts.push(`Energy: ${reflection.energyLevel}/10`);
  }

  if (reflection.tags && reflection.tags.length > 0) {
    parts.push(`Tags: ${reflection.tags.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Truncate content to fit within token limits
 *
 * OpenAI text-embedding-3-small has a limit of 8191 tokens (~30,000 characters)
 * We use a conservative limit to ensure we don't exceed the token count
 *
 * @param text - Text to truncate
 * @param maxChars - Maximum characters (default: 25000)
 * @returns Truncated text
 */
export function truncateForEmbedding(text: string, maxChars = 25000): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Truncate and add ellipsis
  return text.substring(0, maxChars) + '...';
}

/**
 * Format and truncate content for embedding in one step
 * Convenience function that combines formatting and truncation
 *
 * @param content - Goal, Note, or Reflection object
 * @returns Formatted and truncated text
 */
export function prepareContentForEmbedding(
  content: Goal | Note | Reflection | Partial<Goal> | Partial<Note> | Partial<Reflection>
): string {
  let formatted: string;

  // Determine content type and format accordingly
  if ('name' in content && 'category' in content) {
    // It's a Goal
    formatted = formatGoalForEmbedding(content as Goal);
  } else if ('noteType' in content) {
    // It's a Note
    formatted = formatNoteForEmbedding(content as Note);
  } else if ('reflectionType' in content) {
    // It's a Reflection
    formatted = formatReflectionForEmbedding(content as Reflection);
  } else {
    // Unknown type, just stringify
    formatted = JSON.stringify(content);
  }

  return truncateForEmbedding(formatted);
}
