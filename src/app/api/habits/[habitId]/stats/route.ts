/**
 * Habit Statistics API
 *
 * GET /api/habits/[habitId]/stats?days=30 - Get habit statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/habits/[habitId]/stats
 * Returns statistics for a habit over a specified period
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
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

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
      .select('*')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitResult.error || !habitResult.data) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    const habit = habitResult.data;

    // Get streak data
    const streakResult: any = await supabase
      .from('habit_streaks')
      .select('*')
      .eq('habit_id', habitId)
      .single();

    const streak = streakResult.data || {
      current_streak: 0,
      longest_streak: 0,
      total_completions: 0,
    };

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use the database function to calculate completion rate
    const rateResult: any = await (supabase as any).rpc('get_habit_completion_rate', {
      p_habit_id: habitId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    const completionRate = rateResult.data || 0;

    // Get completions for the period
    const completionsResult: any = await supabase
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .gte(
        'completion_date',
        startDate.toISOString().split('T')[0]
      )
      .lte(
        'completion_date',
        endDate.toISOString().split('T')[0]
      )
      .order('completion_date', { ascending: false });

    const completions = completionsResult.data || [];

    // Calculate weekly completions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCompletions = completions.filter(
      (c: any) => new Date(c.completion_date) >= weekAgo
    ).length;

    // Calculate monthly completions (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthlyCompletions = completions.filter(
      (c: any) => new Date(c.completion_date) >= monthAgo
    ).length;

    // Build stats object
    const stats = {
      habitId: habitId,
      completionRate: parseFloat(completionRate.toFixed(2)),
      totalCompletions: streak.total_completions,
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      weeklyCompletions,
      monthlyCompletions,
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error in GET /api/habits/[habitId]/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit statistics', details: error.message },
      { status: 500 }
    );
  }
}
