/**
 * Individual Goal Note API Routes
 *
 * PATCH /api/goals/[goalId]/notes/[noteId] - Update a note
 * DELETE /api/goals/[goalId]/notes/[noteId] - Delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/pool';
import type { GoalNote, UpdateGoalNoteInput } from '@/types/goal-notes';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ goalId: string; noteId: string }> }
) {
  try {
    const { goalId, noteId } = await context.params;
    const supabase = await getServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: UpdateGoalNoteInput = await request.json();

    // Validate input
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Update note
    const { data: note, error } = await supabase
      .from('goal_notes')
      .update({
        content: body.content.trim(),
      })
      .eq('id', noteId)
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
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

    return NextResponse.json(transformedNote);
  } catch (error) {
    console.error('Error in PATCH /api/goals/[goalId]/notes/[noteId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ goalId: string; noteId: string }> }
) {
  try {
    const { goalId, noteId } = await context.params;
    const supabase = await getServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete note
    const { error } = await supabase
      .from('goal_notes')
      .delete()
      .eq('id', noteId)
      .eq('goal_id', goalId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting goal note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/goals/[goalId]/notes/[noteId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
