/**
 * Weekly Snapshots API
 *
 * POST /api/snapshots - Create a new weekly snapshot
 * GET /api/snapshots?weekOffset=-1 - Get snapshot for a specific week
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import {
  calculateWeeklyStats,
  createGoalSnapshot,
  createRecurringEventSnapshot,
  generateSnapshotHash,
  getWeekBoundaries,
} from '@/utils/snapshotHelpers';
import { Goal } from '@/types';
import { RecurringEvent, parseRecurringEventFromDb, RecurringEventRow } from '@/types/recurring-events';
import { CalendarEventWithGoal } from '@/types/calendar-events';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/snapshots
 * Create a new weekly snapshot
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get request body
    const body = await request.json();
    const { weekOffset = 0, isFrozen = false } = body;

    // 3. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 4. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 5. Get week boundaries
    const { weekStart, weekEnd } = getWeekBoundaries(weekOffset);

    // 6. Check if snapshot already exists
    const existingSnapshot: any = await supabase
      .from('weekly_snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString())
      .single();

    if (existingSnapshot.data) {
      return NextResponse.json(
        { error: 'Snapshot already exists for this week', snapshotId: existingSnapshot.data.id },
        { status: 409 }
      );
    }

    // 7. Fetch all necessary data
    const [goalsResult, recurringEventsResult, calendarEventsResult, settingsResult]: any[] =
      await Promise.all([
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('recurring_events').select('*').eq('user_id', userId),
        supabase.from('calendar_events').select('*').eq('user_id', userId),
        supabase.from('global_settings').select('*').eq('user_id', userId).single(),
      ]);

    if (goalsResult.error) throw goalsResult.error;
    if (recurringEventsResult.error) throw recurringEventsResult.error;
    if (calendarEventsResult.error) throw calendarEventsResult.error;

    const goals: Goal[] = goalsResult.data || [];
    const recurringEventsRaw: RecurringEventRow[] = recurringEventsResult.data || [];
    const recurringEvents: RecurringEvent[] = recurringEventsRaw.map(parseRecurringEventFromDb);
    const calendarEvents: CalendarEventWithGoal[] = calendarEventsResult.data || [];
    const totalAvailableHours = settingsResult.data?.weekly_available_hours || 112;

    // 8. Calculate weekly statistics
    const weeklyStats = calculateWeeklyStats(
      goals,
      recurringEvents,
      calendarEvents,
      weekOffset,
      totalAvailableHours
    );

    // 9. Generate snapshot hash
    const snapshotHash = generateSnapshotHash(goals, recurringEvents);

    // 10. Create main snapshot
    const snapshotResult: any = await (supabase as any)
      .from('weekly_snapshots')
      .insert({
        user_id: userId,
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
        total_available_hours: totalAvailableHours,
        total_allocated_hours: weeklyStats.totalAllocatedHours,
        total_completed_hours: weeklyStats.totalCompletedHours,
        total_scheduled_hours: weeklyStats.totalScheduledHours,
        free_time_hours: weeklyStats.freeTimeHours,
        is_frozen: isFrozen,
        snapshot_hash: snapshotHash,
      })
      .select()
      .single();

    if (snapshotResult.error) throw snapshotResult.error;

    const snapshot = snapshotResult.data;

    // 11. Create goal snapshots
    const goalSnapshotPromises = goals.map(async (goal) => {
      const goalSnapshotData = createGoalSnapshot(
        goal,
        recurringEvents,
        calendarEvents,
        weekOffset
      );

      const result: any = await (supabase as any)
        .from('weekly_goal_snapshots')
        .insert({
          snapshot_id: snapshot.id,
          ...goalSnapshotData,
        })
        .select()
        .single();

      if (result.error) throw result.error;
      return result.data;
    });

    const goalSnapshots = await Promise.all(goalSnapshotPromises);

    // 12. Create recurring event snapshots
    // Map goal IDs to goal snapshot IDs
    const goalToSnapshotMap = new Map(
      goalSnapshots.map((gs) => [gs.goal_id, gs.id])
    );

    const recurringEventSnapshotPromises = recurringEvents.map(async (event) => {
      const goalSnapshotId = event.goalId ? goalToSnapshotMap.get(event.goalId) : undefined;
      const eventSnapshotData = createRecurringEventSnapshot(event, goalSnapshotId);

      const result: any = await (supabase as any)
        .from('weekly_recurring_event_snapshots')
        .insert({
          snapshot_id: snapshot.id,
          ...eventSnapshotData,
        })
        .select()
        .single();

      if (result.error) throw result.error;
      return result.data;
    });

    const recurringEventSnapshots = await Promise.all(recurringEventSnapshotPromises);

    // 13. Return complete snapshot
    return NextResponse.json({
      snapshot,
      goalSnapshots,
      recurringEventSnapshots,
    });
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/snapshots?weekOffset=-1
 * Get snapshot for a specific week
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);

    // 3. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 4. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 5. Get week boundaries
    const { weekStart } = getWeekBoundaries(weekOffset);

    // 6. Fetch snapshot
    const snapshotResult: any = await supabase
      .from('weekly_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString())
      .single();

    // If no snapshot exists, return null (not an error)
    if (snapshotResult.error || !snapshotResult.data) {
      return NextResponse.json({ snapshot: null });
    }

    const snapshot = snapshotResult.data;

    // 7. Fetch related data
    const [goalSnapshotsResult, recurringEventSnapshotsResult]: any[] = await Promise.all([
      supabase
        .from('weekly_goal_snapshots')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .order('goal_name', { ascending: true }),
      supabase
        .from('weekly_recurring_event_snapshots')
        .select('*')
        .eq('snapshot_id', snapshot.id),
    ]);

    if (goalSnapshotsResult.error) throw goalSnapshotsResult.error;
    if (recurringEventSnapshotsResult.error) throw recurringEventSnapshotsResult.error;

    // 8. Return complete snapshot
    return NextResponse.json({
      snapshot,
      goalSnapshots: goalSnapshotsResult.data || [],
      recurringEventSnapshots: recurringEventSnapshotsResult.data || [],
    });
  } catch (error: any) {
    console.error('Error fetching snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot', details: error.message },
      { status: 500 }
    );
  }
}
