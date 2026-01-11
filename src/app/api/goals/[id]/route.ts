/**
 * Goals API - Individual Goal Operations
 *
 * GET /api/goals/:id - Get single goal
 * PATCH /api/goals/:id - Update goal (with conditional embedding regeneration)
 * DELETE /api/goals/:id - Delete goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Safely convert a date value to ISO string or pass through if already a string
 * Handles both Date objects and ISO string inputs
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
 * GET /api/goals/:id
 * Returns a single goal by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Fetch goal with connections
    // Type cast to bypass Supabase's complex type inference issues
    const result: any = await supabase
      .from('goals')
      .select(`
        *,
        goal_connections_from:goal_connections!from_goal_id(*)
      `)
      .eq('id', id)
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = result.data;

    // 3. Verify user owns this goal
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || goal.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Transform to frontend format
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
      connections: (goal.goal_connections_from || []).map((c: any) => ({
        id: c.id,
        fromGoalId: c.from_goal_id,
        toGoalId: c.to_goal_id,
        type: c.type,
        strength: c.strength,
        description: c.description,
      })),
    };

    return NextResponse.json({ goal: formattedGoal });
  } catch (error: any) {
    console.error('Error in GET /api/goals/:id:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/:id
 * Updates a goal with conditional embedding regeneration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Fetch existing goal
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const existingGoal = fetchResult.data;

    // 4. Verify user owns this goal
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || existingGoal.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Determine if embedding needs regeneration
    const needsNewEmbedding = embeddingService.needsEmbeddingRegeneration('goal', body);

    // 6. Build update object
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.timeAllocated !== undefined) updateData.time_allocated = body.timeAllocated;
    if (body.progressPercentage !== undefined) updateData.progress_percentage = body.progressPercentage;
    if (body.startDate !== undefined) updateData.start_date = ensureDateString(body.startDate);
    if (body.targetEndDate !== undefined) updateData.target_end_date = ensureDateString(body.targetEndDate);
    if (body.actualEndDate !== undefined) updateData.actual_end_date = ensureDateString(body.actualEndDate);
    if (body.tags !== undefined) updateData.tags = body.tags;

    // 7. Regenerate embedding if needed
    if (needsNewEmbedding) {
      const updatedGoal = {
        name: body.name !== undefined ? body.name : existingGoal.name,
        description: body.description !== undefined ? body.description : existingGoal.description,
        category: body.category !== undefined ? body.category : existingGoal.category,
        priority: body.priority !== undefined ? body.priority : existingGoal.priority,
        status: body.status !== undefined ? body.status : existingGoal.status,
        tags: body.tags !== undefined ? body.tags : existingGoal.tags,
      };

      const embedding = await embeddingService.generateGoalEmbedding(updatedGoal);
      updateData.embedding = embedding;
    }

    // 8. Update goal in database
    const updateResult: any = await (supabase as any)
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        goal_connections_from:goal_connections!from_goal_id(*)
      `)
      .single();

    const { data: goal, error: updateError } = updateResult;

    if (updateError) {
      console.error('Error updating goal:', updateError);
      throw updateError;
    }

    // 9. Transform to frontend format
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
      connections: (goal.goal_connections_from || []).map((c: any) => ({
        id: c.id,
        fromGoalId: c.from_goal_id,
        toGoalId: c.to_goal_id,
        type: c.type,
        strength: c.strength,
        description: c.description,
      })),
    };

    return NextResponse.json({ goal: formattedGoal });
  } catch (error: any) {
    console.error('Error in PATCH /api/goals/:id:', error);
    return NextResponse.json(
      { error: 'Failed to update goal', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/:id
 * Deletes a goal and all its connections
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Verify goal exists and user owns it
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const existingGoal = fetchResult.data;

    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || existingGoal.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Delete goal (connections will cascade delete automatically)
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting goal:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/goals/:id:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal', details: error.message },
      { status: 500 }
    );
  }
}
