/**
 * Habits API - Individual Habit Operations
 *
 * GET /api/habits/[habitId] - Get single habit
 * PUT /api/habits/[habitId] - Update habit
 * DELETE /api/habits/[habitId] - Delete habit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import {
  Habit,
  HabitFrequencyType,
  HabitTrackingType,
} from '@/types/habits';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/habits/[habitId]
 * Returns a single habit by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
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

    // Fetch habit with streak
    const habitResult: any = await supabase
      .from('habits')
      .select(
        `
        *,
        habit_streaks(*)
      `
      )
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitResult.error || !habitResult.data) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const h = habitResult.data;
    const streakData = h.habit_streaks?.[0];

    const habit: any = {
      id: h.id,
      userId: h.user_id,
      name: h.name,
      description: h.description || undefined,
      icon: h.icon || undefined,
      color: h.color || undefined,
      frequencyType: h.frequency_type as HabitFrequencyType,
      frequencyCount: h.frequency_count || undefined,
      intervalDays: h.interval_days || undefined,
      preferredTime: h.preferred_time || undefined,
      reminderEnabled: h.reminder_enabled || false,
      reminderTime: h.reminder_time || undefined,
      trackingType: h.tracking_type as HabitTrackingType,
      targetValue: h.target_value || undefined,
      unit: h.unit || undefined,
      relatedGoalId: h.related_goal_id || undefined,
      category: h.category || undefined,
      cue: h.cue || undefined,
      reward: h.reward || undefined,
      isActive: h.is_active,
      archivedAt: h.archived_at ? new Date(h.archived_at) : undefined,
      createdAt: new Date(h.created_at),
      updatedAt: new Date(h.updated_at),
      streak: streakData
        ? {
            habitId: streakData.habit_id,
            userId: streakData.user_id,
            currentStreak: streakData.current_streak || 0,
            longestStreak: streakData.longest_streak || 0,
            totalCompletions: streakData.total_completions || 0,
            lastCompletionDate: streakData.last_completion_date
              ? new Date(streakData.last_completion_date)
              : undefined,
            streakStartDate: streakData.streak_start_date
              ? new Date(streakData.streak_start_date)
              : undefined,
            updatedAt: new Date(streakData.updated_at),
          }
        : undefined,
    };

    return NextResponse.json({ habit });
  } catch (error: any) {
    console.error('Error in GET /api/habits/[habitId]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/habits/[habitId]
 * Updates a habit
 */
export async function PUT(
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

    // Check if habit exists and belongs to user
    const existingHabit: any = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (existingHabit.error || !existingHabit.data) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Check if embedding regeneration is needed
    const needsEmbedding = embeddingService.needsEmbeddingRegeneration(
      'habit',
      body
    );

    let embedding: number[] | undefined;
    if (needsEmbedding) {
      const habitForEmbedding = {
        name: body.name || existingHabit.data.name,
        description: body.description || existingHabit.data.description || '',
        category: body.category || existingHabit.data.category || '',
        cue: body.cue || existingHabit.data.cue || '',
      };
      embedding = await embeddingService.generateHabitEmbedding(
        habitForEmbedding
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.frequencyType !== undefined)
      updateData.frequency_type = body.frequencyType;
    if (body.frequencyCount !== undefined)
      updateData.frequency_count = body.frequencyCount;
    if (body.intervalDays !== undefined)
      updateData.interval_days = body.intervalDays;
    if (body.preferredTime !== undefined)
      updateData.preferred_time = body.preferredTime;
    if (body.reminderEnabled !== undefined)
      updateData.reminder_enabled = body.reminderEnabled;
    if (body.reminderTime !== undefined)
      updateData.reminder_time = body.reminderTime;
    if (body.trackingType !== undefined)
      updateData.tracking_type = body.trackingType;
    if (body.targetValue !== undefined)
      updateData.target_value = body.targetValue;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.relatedGoalId !== undefined)
      updateData.related_goal_id = body.relatedGoalId;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.cue !== undefined) updateData.cue = body.cue;
    if (body.reward !== undefined) updateData.reward = body.reward;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.archivedAt !== undefined)
      updateData.archived_at = body.archivedAt
        ? new Date(body.archivedAt).toISOString()
        : null;

    if (embedding) {
      updateData.embedding = embedding;
    }

    // Update habit
    const updateResult: any = await (supabase as any)
      .from('habits')
      .update(updateData)
      .eq('id', habitId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateResult.error) {
      console.error('Error updating habit:', updateResult.error);
      throw updateResult.error;
    }

    const h = updateResult.data;

    const habit: Habit = {
      id: h.id,
      userId: h.user_id,
      name: h.name,
      description: h.description || undefined,
      icon: h.icon || undefined,
      color: h.color || undefined,
      frequencyType: h.frequency_type as HabitFrequencyType,
      frequencyCount: h.frequency_count || undefined,
      intervalDays: h.interval_days || undefined,
      preferredTime: h.preferred_time || undefined,
      reminderEnabled: h.reminder_enabled || false,
      reminderTime: h.reminder_time || undefined,
      trackingType: h.tracking_type as HabitTrackingType,
      targetValue: h.target_value || undefined,
      unit: h.unit || undefined,
      relatedGoalId: h.related_goal_id || undefined,
      category: h.category || undefined,
      cue: h.cue || undefined,
      reward: h.reward || undefined,
      isActive: h.is_active,
      archivedAt: h.archived_at ? new Date(h.archived_at) : undefined,
      createdAt: new Date(h.created_at),
      updatedAt: new Date(h.updated_at),
    };

    return NextResponse.json({ habit });
  } catch (error: any) {
    console.error('Error in PUT /api/habits/[habitId]:', error);
    return NextResponse.json(
      { error: 'Failed to update habit', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/habits/[habitId]
 * Deletes a habit (hard delete)
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

    // Delete habit (cascade will delete completions and streaks)
    const deleteResult: any = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', userId);

    if (deleteResult.error) {
      console.error('Error deleting habit:', deleteResult.error);
      throw deleteResult.error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/habits/[habitId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete habit', details: error.message },
      { status: 500 }
    );
  }
}
