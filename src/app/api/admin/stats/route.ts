/**
 * Admin Platform Statistics API
 *
 * GET /api/admin/stats - Get platform-wide statistics and analytics
 */

import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/check-admin';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * GET /api/admin/stats
 * Returns platform-wide statistics and analytics
 */
export async function GET() {
  try {
    // 1. Check admin access
    const session = await checkAdminAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Fetch all data in parallel
    const [
      usersResult,
      goalsResult,
      notesResult,
      reflectionsResult,
      eventsResult,
      canvasResult,
      timeEntriesResult,
    ]: any[] = await Promise.all([
      supabase.from('users').select('id, email, created_at'),
      supabase.from('goals').select('id, user_id, status, created_at, updated_at'),
      supabase.from('notes').select('id, user_id, created_at'),
      supabase.from('reflections').select('id, user_id, created_at'),
      supabase.from('calendar_events').select('id, user_id, created_at'),
      supabase.from('canvas_workspaces').select('id, user_id, created_at, last_modified_at'),
      supabase.from('time_entries').select('id, user_id, duration_minutes, created_at'),
    ]);

    const users = usersResult.data || [];
    const goals = goalsResult.data || [];
    const notes = notesResult.data || [];
    const reflections = reflectionsResult.data || [];
    const events = eventsResult.data || [];
    const canvases = canvasResult.data || [];
    const timeEntries = timeEntriesResult.data || [];

    // 4. Calculate basic totals
    const totals = {
      users: users.length,
      goals: goals.length,
      activeGoals: goals.filter((g: any) => g.status === 'in_progress').length,
      completedGoals: goals.filter((g: any) => g.status === 'completed').length,
      notes: notes.length,
      reflections: reflections.length,
      events: events.length,
      canvases: canvases.length,
      timeEntries: timeEntries.length,
      totalTimeTrackedHours: Math.round(
        timeEntries.reduce((sum: number, entry: any) => sum + (entry.duration_minutes || 0), 0) / 60
      ),
    };

    // 5. Calculate user registrations by month (last 12 months)
    const now = new Date();
    const monthsAgo12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const registrationsByMonth: Record<string, number> = {};
    users.forEach((user: any) => {
      const date = new Date(user.created_at);
      if (date >= monthsAgo12) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        registrationsByMonth[monthKey] = (registrationsByMonth[monthKey] || 0) + 1;
      }
    });

    // 6. Calculate activity by day (last 30 days)
    const daysAgo30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activityByDay: Record<string, number> = {};

    const addToActivity = (items: any[]) => {
      items.forEach((item: any) => {
        const date = new Date(item.created_at);
        if (date >= daysAgo30) {
          const dayKey = date.toISOString().split('T')[0];
          activityByDay[dayKey] = (activityByDay[dayKey] || 0) + 1;
        }
      });
    };

    addToActivity(goals);
    addToActivity(notes);
    addToActivity(reflections);
    addToActivity(events);

    // 7. Calculate top users by activity
    const userActivity: Record<string, { email: string; count: number }> = {};

    const addUserActivity = (items: any[]) => {
      items.forEach((item: any) => {
        if (item.user_id) {
          const user = users.find((u: any) => u.id === item.user_id);
          if (user) {
            if (!userActivity[item.user_id]) {
              userActivity[item.user_id] = { email: user.email, count: 0 };
            }
            userActivity[item.user_id].count++;
          }
        }
      });
    };

    addUserActivity(goals);
    addUserActivity(notes);
    addUserActivity(reflections);
    addUserActivity(events);

    const topUsers = Object.entries(userActivity)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 8. Calculate content creation trends (last 7 days vs previous 7 days)
    const daysAgo7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const daysAgo14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const countInPeriod = (items: any[], start: Date, end: Date) => {
      return items.filter((item: any) => {
        const date = new Date(item.created_at);
        return date >= start && date < end;
      }).length;
    };

    const trends = {
      goals: {
        current: countInPeriod(goals, daysAgo7, now),
        previous: countInPeriod(goals, daysAgo14, daysAgo7),
      },
      notes: {
        current: countInPeriod(notes, daysAgo7, now),
        previous: countInPeriod(notes, daysAgo14, daysAgo7),
      },
      reflections: {
        current: countInPeriod(reflections, daysAgo7, now),
        previous: countInPeriod(reflections, daysAgo14, daysAgo7),
      },
      events: {
        current: countInPeriod(events, daysAgo7, now),
        previous: countInPeriod(events, daysAgo14, daysAgo7),
      },
    };

    // Calculate percentage change
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const trendsWithChange = {
      goals: {
        ...trends.goals,
        change: calculateChange(trends.goals.current, trends.goals.previous),
      },
      notes: {
        ...trends.notes,
        change: calculateChange(trends.notes.current, trends.notes.previous),
      },
      reflections: {
        ...trends.reflections,
        change: calculateChange(trends.reflections.current, trends.reflections.previous),
      },
      events: {
        ...trends.events,
        change: calculateChange(trends.events.current, trends.events.previous),
      },
    };

    // 9. Calculate average items per user
    const averages = {
      goalsPerUser: users.length > 0 ? (goals.length / users.length).toFixed(1) : '0',
      notesPerUser: users.length > 0 ? (notes.length / users.length).toFixed(1) : '0',
      eventsPerUser: users.length > 0 ? (events.length / users.length).toFixed(1) : '0',
      hoursPerUser: users.length > 0 ? (totals.totalTimeTrackedHours / users.length).toFixed(1) : '0',
    };

    return NextResponse.json({
      totals,
      averages,
      registrationsByMonth,
      activityByDay,
      topUsers,
      trends: trendsWithChange,
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform statistics', details: error.message },
      { status: 500 }
    );
  }
}
