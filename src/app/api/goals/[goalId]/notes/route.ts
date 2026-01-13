/**
 * Goal Notes API Routes
 *
 * GET /api/goals/[goalId]/notes - Get all notes for a goal
 * POST /api/goals/[goalId]/notes - Create a new note for a goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/pool';
import type { GoalNote, CreateGoalNoteInput } from '@/types/goal-notes';
import type { Database } from '@/types/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await context.params;
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch notes for the goal
    const { data: notes, error } = await (supabase as any)
      .from('goal_notes')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goal notes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase
    const transformedNotes: GoalNote[] = notes.map((note) => ({
      id: note.id,
      goalId: note.goal_id,
      userId: note.user_id,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));

    return NextResponse.json(transformedNotes);
  } catch (error) {
    console.error('Error in GET /api/goals/[goalId]/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await context.params;
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: CreateGoalNoteInput = await request.json();

    // Validate input
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create note
    const { data: note, error } = await (supabase as any)
      .from('goal_notes')
      .insert({
        goal_id: goalId,
        user_id: user.id,
        content: body.content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase
    const transformedNote: GoalNote = {
      id: note.id,
      goalId: note.goal_id,
      userId: note.user_id,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json(transformedNote, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/goals/[goalId]/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
