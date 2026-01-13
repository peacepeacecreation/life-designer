/**
 * Goals Migration API
 *
 * POST /api/migrate/goals - Migrate goals from localStorage to Supabase
 *
 * Handles:
 * - Batch embedding generation
 * - Preserving original IDs and timestamps
 * - Migrating connections between goals
 * - Error handling for partial failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Goal, GoalConnection } from '@/types/goals';

export const runtime = 'nodejs';
export const maxDuration = 30; // Allow more time for batch migration

interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: number;
  errorDetails: Array<{ goalId: string; error: string }>;
}

/**
 * Safely convert a date value to ISO string
 * Handles both Date objects and ISO string inputs
 */
function toISOString(date: Date | string | undefined | null): string | null {
  if (!date) return null;

  // If already a string, return as-is (assume it's ISO format)
  if (typeof date === 'string') {
    return date;
  }

  // If it's a Date object, convert to ISO string
  if (date instanceof Date) {
    return date.toISOString();
  }

  // Fallback: try to parse and convert
  try {
    return new Date(date as any).toISOString();
  } catch (error) {
    console.error('Failed to convert date to ISO string:', date);
    return null;
  }
}

/**
 * POST /api/migrate/goals
 * Migrates goals from localStorage to Supabase with batch embedding generation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerClient();

    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Service unavailable',
          details: 'Database not configured. Please add Supabase environment variables to .env.local'
        },
        { status: 503 }
      );
    }

    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const { goals }: { goals: Goal[] } = await request.json();

    if (!Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { error: 'Goals array is required and must not be empty' },
        { status: 400 }
      );
    }

    // 3. Get or create user
    let userId: string;
    const existingUserResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (existingUserResult.data) {
      userId = existingUserResult.data.id;
    } else {
      const newUserResult: any = await (supabase as any)
        .from('users')
        .insert({ email: session.user.email })
        .select('id')
        .single();

      if (newUserResult.error || !newUserResult.data) {
        throw new Error('Failed to create user');
      }
      userId = newUserResult.data.id;
    }

    // 4. Generate embeddings for all goals (batch processing)
    console.log(`Generating embeddings for ${goals.length} goals...`);
    const embeddings = await embeddingService.generateGoalEmbeddingsBatch(goals);
    console.log(`Embeddings generated successfully`);

    // 5. Migrate goals
    const results: MigrationResult = {
      success: true,
      migrated: 0,
      errors: 0,
      errorDetails: [],
    };

    // Store connections separately to add after all goals are inserted
    const allConnections: Array<{ goalId: string; connections: GoalConnection[] }> = [];

    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      const embedding = embeddings[i];

      try {
        // Insert goal with embedding
        const insertResult: any = await (supabase as any)
          .from('goals')
          .insert({
            id: goal.id, // Preserve original ID if possible
            user_id: userId,
            name: goal.name,
            description: goal.description,
            category: goal.category,
            priority: goal.priority,
            status: goal.status,
            time_allocated: goal.timeAllocated,
            start_date: toISOString(goal.startDate),
            target_end_date: toISOString(goal.targetEndDate),
            actual_end_date: toISOString(goal.actualEndDate),
            tags: goal.tags || [],
            created_at: toISOString(goal.createdAt),
            updated_at: toISOString(goal.updatedAt),
            embedding,
          })
          .select()
          .single();

        const { data, error } = insertResult;

        if (error) {
          // If duplicate ID, try without specifying ID
          if (error.code === '23505') {
            const retryResult: any = await (supabase as any)
              .from('goals')
              .insert({
                user_id: userId,
                name: goal.name,
                description: goal.description,
                category: goal.category,
                priority: goal.priority,
                status: goal.status,
                time_allocated: goal.timeAllocated,
                progress_percentage: goal.progressPercentage,
                start_date: toISOString(goal.startDate),
                target_end_date: toISOString(goal.targetEndDate),
                actual_end_date: toISOString(goal.actualEndDate),
                tags: goal.tags || [],
                embedding,
              })
              .select()
              .single();

            if (retryResult.error) {
              throw retryResult.error;
            }
          } else {
            throw error;
          }
        }

        results.migrated++;

        // Store connections for later
        if (goal.connections && goal.connections.length > 0) {
          allConnections.push({
            goalId: goal.id,
            connections: goal.connections,
          });
        }
      } catch (err: any) {
        console.error(`Error migrating goal ${goal.id}:`, err);
        results.errors++;
        results.errorDetails.push({
          goalId: goal.id,
          error: err.message || 'Unknown error',
        });
      }
    }

    // 6. Migrate connections (after all goals are inserted)
    for (const { goalId, connections } of allConnections) {
      for (const conn of connections) {
        try {
          await (supabase as any).from('goal_connections').insert({
            id: conn.id,
            from_goal_id: conn.fromGoalId,
            to_goal_id: conn.toGoalId,
            type: conn.type,
            strength: conn.strength,
            description: conn.description || null,
          });
        } catch (err: any) {
          // Don't fail the whole migration if connections fail
          console.error(`Error migrating connection ${conn.id}:`, err);
        }
      }
    }

    // 7. Return results
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate/goals
 * Returns migration status and instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/migrate/goals',
    method: 'POST',
    description: 'Migrate goals from localStorage to Supabase',
    body: {
      goals: 'Array<Goal>',
    },
    response: {
      success: 'boolean',
      migrated: 'number',
      errors: 'number',
      errorDetails: 'Array<{ goalId: string; error: string }>',
    },
    notes: [
      'Embeddings are generated automatically during migration',
      'Original IDs and timestamps are preserved when possible',
      'Connections are migrated after all goals are inserted',
      'Partial failures are reported in errorDetails',
    ],
  });
}
