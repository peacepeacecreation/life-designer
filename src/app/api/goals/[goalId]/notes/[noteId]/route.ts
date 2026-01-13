/**
 * Individual Goal Note API Routes
 *
 * PATCH /api/goals/[goalId]/notes/[noteId] - Update a note
 * DELETE /api/goals/[goalId]/notes/[noteId] - Delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import type { GoalNote, UpdateGoalNoteInput } from '@/types/goal-notes';
import type { Database } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ goalId: string; noteId: string }> }
) {
  try {
    const { goalId, noteId } = await context.params;

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get user ID from email
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    const { data: note, error } = await (supabase as any)
      .from('goal_notes')
      .update({
        content: body.content.trim(),
      })
      .eq('id', noteId)
      .eq('goal_id', goalId)
      .eq('user_id', userData.id)
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

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get user ID from email
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete note
    const { error } = await (supabase as any)
      .from('goal_notes')
      .delete()
      .eq('id', noteId)
      .eq('goal_id', goalId)
      .eq('user_id', userData.id);

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
