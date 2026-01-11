/**
 * Semantic Search API
 *
 * POST /api/search - Search across Goals, Notes, and Reflections using vector similarity
 *
 * Handles:
 * - Query embedding generation
 * - Vector similarity search in Supabase
 * - Multi-type search (goals, notes, reflections)
 * - Result ranking by similarity
 * - Filtering by minimum similarity threshold
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { cache as searchCache } from '@/lib/cache/search-cache';
import { ContentType, SearchResultItem } from '@/types/search';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';
import { Note, NoteType } from '@/types/notes';
import { Reflection, ReflectionType } from '@/types/reflections';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/search
 * Performs semantic search across specified content types
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      query,
      types = [ContentType.GOAL, ContentType.NOTE, ContentType.REFLECTION],
      limit = 20,
      minSimilarity = 0.7,
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 4. Check cache for existing results
    const cachedResults = searchCache.get(userId, query, types);
    if (cachedResults) {
      return NextResponse.json(cachedResults);
    }

    // 5. Generate embedding for search query
    const queryEmbedding = await embeddingService.generateSearchQueryEmbedding(query);

    // 5. Search across requested content types
    const results: SearchResultItem[] = [];

    // Search Goals
    if (types.includes(ContentType.GOAL)) {
      try {
        const goalRpcResult: any = await (supabase as any).rpc('search_goals', {
          query_embedding: queryEmbedding,
          user_id: userId,
          match_threshold: minSimilarity,
          match_count: limit,
        });

        const { data: goalResults, error: goalError } = goalRpcResult;

        if (!goalError && goalResults) {
          for (const result of goalResults) {
            results.push({
              type: ContentType.GOAL,
              data: {
                id: result.id,
                name: result.name,
                description: result.description,
                category: result.category as GoalCategory,
                priority: result.priority as GoalPriority,
                status: result.status as GoalStatus,
                timeAllocated: result.time_allocated,
                progressPercentage: result.progress_percentage,
                startDate: new Date(result.start_date),
                targetEndDate: new Date(result.target_end_date),
                actualEndDate: result.actual_end_date ? new Date(result.actual_end_date) : undefined,
                tags: result.tags || [],
                createdAt: new Date(result.created_at),
                updatedAt: new Date(result.updated_at),
                connections: [],
              } as Goal,
              similarity: result.similarity,
            });
          }
        }
      } catch (err) {
        console.error('Error searching goals:', err);
      }
    }

    // Search Notes
    if (types.includes(ContentType.NOTE)) {
      try {
        const noteRpcResult: any = await (supabase as any).rpc('search_notes', {
          query_embedding: queryEmbedding,
          user_id: userId,
          match_threshold: minSimilarity,
          match_count: limit,
        });

        const { data: noteResults, error: noteError } = noteRpcResult;

        if (!noteError && noteResults) {
          for (const result of noteResults) {
            results.push({
              type: ContentType.NOTE,
              data: {
                id: result.id,
                userId: result.user_id,
                title: result.title,
                content: result.content,
                category: result.category,
                noteType: result.note_type as NoteType,
                tags: result.tags || [],
                relatedGoalIds: result.related_goal_ids || [],
                isPinned: result.is_pinned,
                isArchived: result.is_archived,
                createdAt: new Date(result.created_at),
                updatedAt: new Date(result.updated_at),
              } as Note,
              similarity: result.similarity,
            });
          }
        }
      } catch (err) {
        console.error('Error searching notes:', err);
      }
    }

    // Search Reflections
    if (types.includes(ContentType.REFLECTION)) {
      try {
        const reflectionRpcResult: any = await (supabase as any).rpc('search_reflections', {
          query_embedding: queryEmbedding,
          user_id: userId,
          match_threshold: minSimilarity,
          match_count: limit,
        });

        const { data: reflectionResults, error: reflectionError } = reflectionRpcResult;

        if (!reflectionError && reflectionResults) {
          for (const result of reflectionResults) {
            results.push({
              type: ContentType.REFLECTION,
              data: {
                id: result.id,
                userId: result.user_id,
                title: result.title,
                content: result.content,
                reflectionType: result.reflection_type as ReflectionType,
                reflectionDate: new Date(result.reflection_date),
                moodScore: result.mood_score,
                energyLevel: result.energy_level,
                tags: result.tags || [],
                relatedGoalIds: result.related_goal_ids || [],
                relatedNoteIds: result.related_note_ids || [],
                createdAt: new Date(result.created_at),
                updatedAt: new Date(result.updated_at),
              } as Reflection,
              similarity: result.similarity,
            });
          }
        }
      } catch (err) {
        console.error('Error searching reflections:', err);
      }
    }

    // 6. Sort results by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    // 7. Limit results
    const limitedResults = results.slice(0, limit);

    // 8. Calculate execution time
    const executionTimeMs = Date.now() - startTime;

    // 9. Prepare response
    const response = {
      results: limitedResults,
      totalCount: limitedResults.length,
      executionTimeMs,
      query,
    };

    // 10. Cache results
    searchCache.set(userId, query, response, types);

    // 11. Return results
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/search',
    method: 'POST',
    description: 'Semantic search across Goals, Notes, and Reflections using vector similarity',
    body: {
      query: 'string (required) - Search query text',
      types: 'ContentType[] (optional) - Types to search: ["goal", "note", "reflection"]. Default: all',
      limit: 'number (optional) - Maximum results to return. Default: 20',
      minSimilarity: 'number (optional) - Minimum similarity threshold (0-1). Default: 0.7',
    },
    response: {
      results: 'SearchResultItem[] - Array of search results with type, data, and similarity',
      totalCount: 'number - Total number of results returned',
      executionTimeMs: 'number - Search execution time in milliseconds',
      query: 'string - The search query that was executed',
    },
    example: {
      request: {
        query: 'покращити англійську',
        types: ['goal', 'note'],
        limit: 10,
        minSimilarity: 0.75,
      },
      response: {
        results: [
          {
            type: 'goal',
            data: { name: 'Вивчити англійську', description: '...', similarity: 0.89 },
          },
          {
            type: 'note',
            data: { title: 'Ресурси для англійської', content: '...', similarity: 0.82 },
          },
        ],
        totalCount: 2,
        executionTimeMs: 234,
        query: 'покращити англійську',
      },
    },
    notes: [
      'Requires authentication via NextAuth',
      'Uses OpenAI embeddings for semantic similarity',
      'Searches across user-owned content only',
      'Results are sorted by similarity score (descending)',
      'Minimum similarity threshold filters low-relevance results',
    ],
  });
}
