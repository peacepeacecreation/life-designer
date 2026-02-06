/**
 * Habit Completion API
 *
 * POST /api/habits/[habitId]/complete - Mark habit as completed
 * DELETE /api/habits/[habitId]/complete?date=YYYY-MM-DD - Uncomplete habit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { HabitCompletion } from '@/types/habits';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/habits/[habitId]/complete
 * Marks a habit as completed for a specific date
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    const body = await request.json();
    const {
      completionDate,
      value,
      durationMinutes,
      note,
      moodScore,
    } = body;

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // Verify habit exists and belongs to user
    const habitResult: any = await supabase
      .from('habits')
      .select('id, tracking_type')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitResult.error || !habitResult.data) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Parse completion date (default to today if not provided)
    const dateStr = completionDate
      ? new Date(completionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Insert or update completion
    const insertData: any = {
      habit_id: habitId,
      user_id: userId,
      completion_date: dateStr,
      completed_at: new Date().toISOString(),
      note: note || null,
      mood_score: moodScore || null,
    };

    // Add tracking-specific fields
    if (habitResult.data.tracking_type === 'numeric') {
      insertData.value = value || null;
    } else if (habitResult.data.tracking_type === 'duration') {
      insertData.duration_minutes = durationMinutes || null;
    }

    const completionResult: any = await supabase
      .from('habit_completions')
      .insert(insertData)
      .select()
      .single();

    if (completionResult.error) {
      // Check if it's a duplicate (already completed today)
      if (completionResult.error.code === '23505') {
        // Update existing completion instead
        const updateResult: any = await (supabase as any)
          .from('habit_completions')
          .update({
            completed_at: new Date().toISOString(),
            value: insertData.value,
            duration_minutes: insertData.duration_minutes,
            note: insertData.note,
            mood_score: insertData.mood_score,
          })
          .eq('habit_id', habitId)
          .eq('completion_date', dateStr)
          .select()
          .single();

        if (updateResult.error) {
          throw updateResult.error;
        }

        const c = updateResult.data;
        const completion: HabitCompletion = {
          id: c.id,
          habitId: c.habit_id,
          userId: c.user_id,
          completionDate: new Date(c.completion_date),
          completedAt: new Date(c.completed_at),
          value: c.value || undefined,
          durationMinutes: c.duration_minutes || undefined,
          note: c.note || undefined,
          moodScore: c.mood_score || undefined,
          createdAt: new Date(c.created_at),
        };

        return NextResponse.json({ completion, updated: true });
      }

      console.error('Error creating completion:', completionResult.error);
      throw completionResult.error;
    }

    const c = completionResult.data;
    const completion: HabitCompletion = {
      id: c.id,
      habitId: c.habit_id,
      userId: c.user_id,
      completionDate: new Date(c.completion_date),
      completedAt: new Date(c.completed_at),
      value: c.value || undefined,
      durationMinutes: c.duration_minutes || undefined,
      note: c.note || undefined,
      moodScore: c.mood_score || undefined,
      createdAt: new Date(c.created_at),
    };

    return NextResponse.json({ completion }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/habits/[habitId]/complete:', error);
    return NextResponse.json(
      { error: 'Failed to complete habit', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/habits/[habitId]/complete?date=YYYY-MM-DD
 * Removes a completion for a specific date
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Default to today if no date provided
    const dateStr = dateParam || new Date().toISOString().split('T')[0];

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // Delete completion
    const deleteResult: any = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completion_date', dateStr);

    if (deleteResult.error) {
      console.error('Error deleting completion:', deleteResult.error);
      throw deleteResult.error;
    }

    // Note: Streak will be recalculated when next completion is added
    // For now, we don't automatically recalculate on deletion

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/habits/[habitId]/complete:', error);
    return NextResponse.json(
      { error: 'Failed to uncomplete habit', details: error.message },
      { status: 500 }
    );
  }
}
