/**
 * Quick Search API
 *
 * POST /api/search/quick - Fast semantic search for global search modal
 *
 * Optimized for:
 * - Speed: Limited to 5 results total
 * - Simplicity: No advanced filtering
 * - UI: Designed for Cmd+K modal quick access
 *
 * Returns top 5 most relevant results across all content types
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { ContentType, SearchResultItem } from '@/types/search';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';
import { Note, NoteType } from '@/types/notes';
import { Reflection, ReflectionType } from '@/types/reflections';

export const runtime = 'nodejs';
export const maxDuration = 5; // Faster timeout for quick search

/**
 * POST /api/search/quick
 * Performs fast semantic search limited to 5 results
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
    const { query } = body;

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

    // 4. Generate embedding for search query
    const queryEmbedding = await embeddingService.generateSearchQueryEmbedding(query);

    // 5. Search across all content types (limited to 5 results total)
    const results: SearchResultItem[] = [];
    const matchCount = 5; // Limit each type to 5, then we'll take top 5 overall
    const minSimilarity = 0.6; // Lower threshold for quick search

    // Search Goals
    try {
      const goalRpcResult: any = await (supabase as any).rpc('search_goals', {
        query_embedding: queryEmbedding,
        user_id: userId,
        match_threshold: minSimilarity,
        match_count: matchCount,
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
      console.error('Error in quick search goals:', err);
    }

    // Search Notes
    try {
      const noteRpcResult: any = await (supabase as any).rpc('search_notes', {
        query_embedding: queryEmbedding,
        user_id: userId,
        match_threshold: minSimilarity,
        match_count: matchCount,
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
      console.error('Error in quick search notes:', err);
    }

    // Search Reflections
    try {
      const reflectionRpcResult: any = await (supabase as any).rpc('search_reflections', {
        query_embedding: queryEmbedding,
        user_id: userId,
        match_threshold: minSimilarity,
        match_count: matchCount,
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
      console.error('Error in quick search reflections:', err);
    }

    // 6. Sort by similarity and take top 5
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, 5);

    // 7. Calculate execution time
    const executionTimeMs = Date.now() - startTime;

    // 8. Return results
    return NextResponse.json({
      results: topResults,
      totalCount: topResults.length,
      executionTimeMs,
      query,
    });
  } catch (error: any) {
    console.error('Quick search error:', error);
    return NextResponse.json(
      {
        error: 'Quick search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/quick
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/search/quick',
    method: 'POST',
    description: 'Fast semantic search limited to 5 results for quick access (Cmd+K modal)',
    body: {
      query: 'string (required) - Search query text',
    },
    response: {
      results: 'SearchResultItem[] - Top 5 most relevant results',
      totalCount: 'number - Number of results returned (max 5)',
      executionTimeMs: 'number - Search execution time',
      query: 'string - The search query',
    },
    features: [
      'Limited to 5 results for speed',
      'Searches all content types (goals, notes, reflections)',
      'Lower similarity threshold (0.6) for broader matches',
      'Optimized for Cmd+K quick search modal',
    ],
  });
}
