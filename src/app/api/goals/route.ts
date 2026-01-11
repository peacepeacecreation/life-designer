/**
 * Goals API - List and Create
 *
 * GET /api/goals - List all goals for authenticated user
 * POST /api/goals - Create new goal with automatic embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Safely convert a date value to ISO string or pass through if already a string
 */
function ensureDateString(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  try {
    return new Date(date as any).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * GET /api/goals
 * Returns all goals for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.data;

    // 4. Fetch goals with connections
    const goalsResult: any = await supabase
      .from('goals')
      .select(`
        *,
        goal_connections_from:goal_connections!from_goal_id(*)
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    const { data: goals, error } = goalsResult;

    if (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }

    // 5. Transform to frontend format
    const formattedGoals: Goal[] = (goals || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category as GoalCategory,
      priority: g.priority as GoalPriority,
      status: g.status as GoalStatus,
      timeAllocated: g.time_allocated,
      progressPercentage: g.progress_percentage,
      startDate: new Date(g.start_date),
      targetEndDate: new Date(g.target_end_date),
      actualEndDate: g.actual_end_date ? new Date(g.actual_end_date) : undefined,
      tags: g.tags || [],
      iconUrl: g.icon_url,
      url: g.url,
      createdAt: new Date(g.created_at),
      updatedAt: new Date(g.updated_at),
      connections: (g.goal_connections_from || []).map((c: any) => ({
        id: c.id,
        fromGoalId: c.from_goal_id,
        toGoalId: c.to_goal_id,
        type: c.type,
        strength: c.strength,
        description: c.description,
      })),
    }));

    return NextResponse.json({ goals: formattedGoals });
  } catch (error: any) {
    console.error('Error in GET /api/goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals
 * Creates a new goal with automatic embedding generation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      name,
      description,
      category,
      priority,
      status,
      timeAllocated,
      progressPercentage,
      startDate,
      targetEndDate,
      actualEndDate,
      tags,
    } = body;

    // 3. Validate required fields
    if (!name || !description || !category || !priority || !status || !startDate || !targetEndDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 4. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 5. Get or create user
    let userId: string;
    const existingUserResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (existingUserResult.data) {
      userId = existingUserResult.data.id;
    } else {
      // Create user if doesn't exist
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

    // 6. Generate embedding
    const goalForEmbedding = {
      name,
      description,
      category,
      priority,
      status,
      tags: tags || [],
    };

    const embedding = await embeddingService.generateGoalEmbedding(goalForEmbedding);

    // 7. Insert goal into database
    const insertResult: any = await (supabase as any)
      .from('goals')
      .insert({
        user_id: userId,
        name,
        description,
        category,
        priority,
        status,
        time_allocated: timeAllocated || 0,
        progress_percentage: progressPercentage || 0,
        start_date: ensureDateString(startDate),
        target_end_date: ensureDateString(targetEndDate),
        actual_end_date: ensureDateString(actualEndDate),
        tags: tags || [],
        embedding,
      })
      .select()
      .single();

    const { data: goal, error: insertError } = insertResult;

    if (insertError) {
      console.error('Error inserting goal:', insertError);
      throw insertError;
    }

    // 8. Transform to frontend format
    const formattedGoal: Goal = {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      category: goal.category as GoalCategory,
      priority: goal.priority as GoalPriority,
      status: goal.status as GoalStatus,
      timeAllocated: goal.time_allocated,
      progressPercentage: goal.progress_percentage,
      startDate: new Date(goal.start_date),
      targetEndDate: new Date(goal.target_end_date),
      actualEndDate: goal.actual_end_date ? new Date(goal.actual_end_date) : undefined,
      tags: goal.tags || [],
      createdAt: new Date(goal.created_at),
      updatedAt: new Date(goal.updated_at),
      connections: [],
    };

    return NextResponse.json({ goal: formattedGoal }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/goals:', error);
    return NextResponse.json(
      { error: 'Failed to create goal', details: error.message },
      { status: 500 }
    );
  }
}
