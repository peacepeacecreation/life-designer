/**
 * Habits API - List and Create
 *
 * GET /api/habits - List all habits for authenticated user
 * POST /api/habits - Create new habit with automatic embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
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
 * GET /api/habits
 * Returns all active habits for the authenticated user
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
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 3. Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    // If user doesn't exist yet, return empty array
    if (userResult.error || !userResult.data) {
      return NextResponse.json({ habits: [] });
    }

    const userData = userResult.data;

    console.log('🔑 Current user:', {
      email: session.user.email,
      user_id: userData.id,
    });

    // 4. Fetch habits with streaks
    const habitsResult: any = await supabase
      .from('habits')
      .select(
        `
        *,
        habit_streaks(*)
      `
      )
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const { data: habits, error } = habitsResult;

    if (error) {
      console.error('Error fetching habits:', error);
      throw error;
    }

    console.log('📊 Raw habits from DB:', {
      count: habits?.length || 0,
      habits: habits?.map((h: any) => ({
        id: h.id,
        name: h.name,
        user_id: h.user_id,
        frequency_type: h.frequency_type,
      })),
    });

    // 5. Get today's completions for these habits
    const today = new Date().toISOString().split('T')[0];
    const habitIds = (habits || []).map((h: any) => h.id);

    let todayCompletions: any[] = [];
    if (habitIds.length > 0) {
      const completionsResult: any = await supabase
        .from('habit_completions')
        .select('*')
        .in('habit_id', habitIds)
        .eq('completion_date', today);

      todayCompletions = completionsResult.data || [];
    }

    // 6. Transform to frontend format
    const formattedHabits: Habit[] = (habits || []).map((h: any) => {
      const todayCompletion = todayCompletions.find(
        (c: any) => c.habit_id === h.id
      );
      const streakData = h.habit_streaks?.[0];

      return {
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
        // Additional UI data
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
        todayCompleted: !!todayCompletion,
        todayCompletion: todayCompletion
          ? {
              id: todayCompletion.id,
              habitId: todayCompletion.habit_id,
              userId: todayCompletion.user_id,
              completionDate: new Date(todayCompletion.completion_date),
              completedAt: new Date(todayCompletion.completed_at),
              value: todayCompletion.value || undefined,
              durationMinutes: todayCompletion.duration_minutes || undefined,
              note: todayCompletion.note || undefined,
              moodScore: todayCompletion.mood_score || undefined,
              createdAt: new Date(todayCompletion.created_at),
            }
          : undefined,
      } as Habit & {
        streak?: any;
        todayCompleted?: boolean;
        todayCompletion?: any;
      };
    });

    console.log('✅ Formatted habits:', {
      count: formattedHabits.length,
      names: formattedHabits.map((h) => h.name),
    });

    return NextResponse.json({ habits: formattedHabits });
  } catch (error: any) {
    console.error('Error in GET /api/habits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habits', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/habits
 * Creates a new habit with automatic embedding generation
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
    console.log('📥 Received request body:', JSON.stringify(body, null, 2));

    const {
      name,
      description,
      icon,
      color,
      frequencyType,
      frequencyCount,
      intervalDays,
      preferredTime,
      reminderEnabled,
      reminderTime,
      trackingType,
      targetValue,
      unit,
      relatedGoalId,
      category,
      cue,
      reward,
    } = body;

    // 3. Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!frequencyType) missingFields.push('frequencyType');
    if (!trackingType) missingFields.push('trackingType');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    // Validate frequency-specific fields
    if (frequencyType === 'weekly' || frequencyType === 'monthly') {
      if (!frequencyCount || frequencyCount < 1) {
        return NextResponse.json(
          { error: 'frequencyCount is required for weekly/monthly habits' },
          { status: 400 }
        );
      }
    }

    if (frequencyType === 'interval') {
      if (!intervalDays || intervalDays < 1) {
        return NextResponse.json(
          { error: 'intervalDays is required for interval habits' },
          { status: 400 }
        );
      }
    }

    // 4. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
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
        .insert({ email: session.user.email } as any)
        .select('id')
        .single();

      if (newUserResult.error || !newUserResult.data) {
        throw new Error('Failed to create user');
      }
      userId = newUserResult.data.id;
    }

    // 6. Generate embedding
    const habitForEmbedding = {
      name,
      description: description || '',
      category: category || '',
      cue: cue || '',
    };

    const embedding = await embeddingService.generateHabitEmbedding(
      habitForEmbedding
    );

    // 7. Insert habit into database
    const insertResult: any = await (supabase as any)
      .from('habits')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        icon: icon || null,
        color: color || '#3b82f6',
        frequency_type: frequencyType,
        frequency_count: frequencyCount || null,
        interval_days: intervalDays || null,
        preferred_time: preferredTime || null,
        reminder_enabled: reminderEnabled || false,
        reminder_time: reminderTime || null,
        tracking_type: trackingType,
        target_value: targetValue || null,
        unit: unit || null,
        related_goal_id: relatedGoalId || null,
        category: category || null,
        cue: cue || null,
        reward: reward || null,
        is_active: true,
        embedding,
      })
      .select()
      .single();

    const { data: habit, error: insertError } = insertResult;

    if (insertError) {
      console.error('Error inserting habit:', insertError);
      throw insertError;
    }

    // 8. Transform to frontend format
    const formattedHabit: Habit = {
      id: habit.id,
      userId: habit.user_id,
      name: habit.name,
      description: habit.description || undefined,
      icon: habit.icon || undefined,
      color: habit.color || undefined,
      frequencyType: habit.frequency_type as HabitFrequencyType,
      frequencyCount: habit.frequency_count || undefined,
      intervalDays: habit.interval_days || undefined,
      preferredTime: habit.preferred_time || undefined,
      reminderEnabled: habit.reminder_enabled || false,
      reminderTime: habit.reminder_time || undefined,
      trackingType: habit.tracking_type as HabitTrackingType,
      targetValue: habit.target_value || undefined,
      unit: habit.unit || undefined,
      relatedGoalId: habit.related_goal_id || undefined,
      category: habit.category || undefined,
      cue: habit.cue || undefined,
      reward: habit.reward || undefined,
      isActive: habit.is_active,
      archivedAt: habit.archived_at ? new Date(habit.archived_at) : undefined,
      createdAt: new Date(habit.created_at),
      updatedAt: new Date(habit.updated_at),
    };

    return NextResponse.json({ habit: formattedHabit }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/habits:', error);
    return NextResponse.json(
      { error: 'Failed to create habit', details: error.message },
      { status: 500 }
    );
  }
}
