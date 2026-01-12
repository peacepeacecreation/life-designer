/**
 * Time Entries Statistics API
 * GET /api/time-entries/stats
 *
 * Returns aggregated time statistics for visualization
 * - Time by goal (for pie charts)
 * - Total hours for period
 * - Entry counts
 * - Daily/weekly breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/time-entries/stats
 * Get aggregated time statistics
 * Query params: startDate (required), endDate (required), groupBy (optional: 'goal', 'day', 'week')
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'goal';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      );
    }

    // 3. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 4. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    // 5. Get time by goal using SQL function
    const { data: timeByGoal, error: goalError } = await (supabase as any).rpc(
      'get_time_by_goal',
      {
        p_user_id: userId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
      }
    );

    if (goalError) {
      console.error('Stats fetch error:', goalError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics: ' + goalError.message },
        { status: 500 }
      );
    }

    // 6. Transform time by goal data
    const byGoal = ((timeByGoal as any[]) || []).map((stat: any) => ({
      goalId: stat.goal_id,
      goalName: stat.goal_name,
      goalCategory: stat.goal_category,
      goalIconUrl: stat.goal_icon_url,
      totalSeconds: stat.total_seconds,
      totalHours: parseFloat(stat.total_hours),
      entryCount: stat.entry_count,
    }));

    // 7. Calculate overall totals
    const totalSeconds = byGoal.reduce((sum: number, stat: any) => sum + stat.totalSeconds, 0);
    const totalHours = parseFloat((totalSeconds / 3600).toFixed(2));
    const totalEntries = byGoal.reduce((sum: number, stat: any) => sum + stat.entryCount, 0);

    // 8. Get daily breakdown if requested
    let byDay: any[] = [];
    if (groupBy === 'day' || groupBy === 'week') {
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('start_time, duration_seconds, goal_id')
        .eq('user_id', userId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .not('end_time', 'is', null);

      if (!entriesError && entriesData) {
        // Group by day
        const dayMap = new Map<string, number>();

        for (const entry of (entriesData as any[])) {
          const date = new Date(entry.start_time);
          const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

          const current = dayMap.get(dayKey) || 0;
          dayMap.set(dayKey, current + (entry.duration_seconds || 0));
        }

        byDay = Array.from(dayMap.entries())
          .map(([date, seconds]) => ({
            date,
            totalSeconds: seconds,
            totalHours: parseFloat((seconds / 3600).toFixed(2)),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    // 9. Get weekly breakdown if requested
    let byWeek: any[] = [];
    if (groupBy === 'week') {
      const weekMap = new Map<string, number>();

      for (const day of byDay) {
        const date = new Date(day.date);
        // Get ISO week number
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
        const weekKey = weekStart.toISOString().split('T')[0];

        const current = weekMap.get(weekKey) || 0;
        weekMap.set(weekKey, current + day.totalSeconds);
      }

      byWeek = Array.from(weekMap.entries())
        .map(([weekStart, seconds]) => ({
          weekStart,
          totalSeconds: seconds,
          totalHours: parseFloat((seconds / 3600).toFixed(2)),
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    }

    // 10. Get source breakdown
    const { data: sourceData, error: sourceError } = await supabase
      .from('time_entries')
      .select('source, duration_seconds')
      .eq('user_id', userId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .not('end_time', 'is', null);

    const bySource = {
      manual: 0,
      clockify: 0,
      calendar_event: 0,
    };

    if (!sourceError && sourceData) {
      for (const entry of (sourceData as any[])) {
        const source = entry.source as 'manual' | 'clockify' | 'calendar_event';
        bySource[source] = (bySource[source] || 0) + (entry.duration_seconds || 0);
      }
    }

    // 11. Return statistics
    return NextResponse.json({
      stats: {
        summary: {
          totalSeconds,
          totalHours,
          totalEntries,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          periodDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        },
        byGoal,
        byDay: groupBy === 'day' || groupBy === 'week' ? byDay : undefined,
        byWeek: groupBy === 'week' ? byWeek : undefined,
        bySource: {
          manual: {
            seconds: bySource.manual,
            hours: parseFloat((bySource.manual / 3600).toFixed(2)),
          },
          clockify: {
            seconds: bySource.clockify,
            hours: parseFloat((bySource.clockify / 3600).toFixed(2)),
          },
          calendarEvent: {
            seconds: bySource.calendar_event,
            hours: parseFloat((bySource.calendar_event / 3600).toFixed(2)),
          },
        },
      },
    });
  } catch (error: any) {
    console.error('GET stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
