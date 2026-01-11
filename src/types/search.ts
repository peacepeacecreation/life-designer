/**
 * Search Types
 * Types for semantic search functionality across Goals, Notes, and Reflections
 */

import { Goal } from './goals';
import { Note } from './notes';
import { Reflection } from './reflections';

/**
 * Content types that can be searched
 */
export enum ContentType {
  GOAL = 'goal',
  NOTE = 'note',
  REFLECTION = 'reflection',
}

/**
 * Search request payload
 */
export interface SearchRequest {
  query: string;
  types?: ContentType[];
  limit?: number;
  minSimilarity?: number;
}

/**
 * Individual search result with type discrimination
 */
export type SearchResultItem =
  | { type: ContentType.GOAL; data: Goal; similarity: number }
  | { type: ContentType.NOTE; data: Note; similarity: number }
  | { type: ContentType.REFLECTION; data: Reflection; similarity: number };

/**
 * Search response payload
 */
export interface SearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  executionTimeMs: number;
  query: string;
}

/**
 * Search filters for UI
 */
export interface SearchFilters {
  types: ContentType[];
  dateFrom?: Date;
  dateTo?: Date;
  minSimilarity: number;
}

/**
 * Search result metadata for display
 */
export interface SearchResultMetadata {
  id: string;
  type: ContentType;
  title: string;
  excerpt: string;
  similarity: number;
  date: Date;
  tags?: string[];
  category?: string;
  icon: string;
  color: string;
}

/**
 * Helper to convert ContentType to display label
 */
export const contentTypeLabels: Record<ContentType, string> = {
  [ContentType.GOAL]: 'Ціль',
  [ContentType.NOTE]: 'Нотатка',
  [ContentType.REFLECTION]: 'Роздум',
};

/**
 * Helper to convert ContentType to icon name
 */
export const contentTypeIcons: Record<ContentType, string> = {
  [ContentType.GOAL]: 'Target',
  [ContentType.NOTE]: 'FileText',
  [ContentType.REFLECTION]: 'Lightbulb',
};

/**
 * Helper to convert ContentType to color
 */
export const contentTypeColors: Record<ContentType, string> = {
  [ContentType.GOAL]: 'hsl(160, 60%, 45%)', // green
  [ContentType.NOTE]: 'hsl(280, 60%, 50%)', // purple
  [ContentType.REFLECTION]: 'hsl(45, 90%, 50%)', // yellow
};
