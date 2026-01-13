/**
 * Snapshot Recalculation API
 *
 * POST /api/snapshots/recalculate
 * Recalculate an existing snapshot with current data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import {
  calculateWeeklyStats,
  createGoalSnapshot,
  createRecurringEventSnapshot,
  generateSnapshotHash,
  getWeekBoundaries,
} from '@/utils/snapshotHelpers';
import { Goal } from '@/types';
import { RecurringEvent } from '@/types/recurring-events';
import { CalendarEventWithGoal } from '@/types/calendar-events';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/snapshots/recalculate
 * Recalculate existing snapshot
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
    const { weekOffset } = body;

    if (weekOffset === undefined) {
      return NextResponse.json({ error: 'weekOffset is required' }, { status: 400 });
    }

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

    // 6. Check if snapshot exists
    const snapshotResult: any = await supabase
      .from('weekly_snapshots')
      .select('id, is_frozen')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString())
      .single();

    if (snapshotResult.error || !snapshotResult.data) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const snapshot = snapshotResult.data;

    // Don't allow recalculation of manually frozen snapshots
    if (snapshot.is_frozen) {
      return NextResponse.json(
        { error: 'Cannot recalculate manually frozen snapshot' },
        { status: 403 }
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
    const recurringEvents: RecurringEvent[] = recurringEventsResult.data || [];
    const calendarEvents: CalendarEventWithGoal[] = calendarEventsResult.data || [];
    const totalAvailableHours = settingsResult.data?.weekly_available_hours || 112;

    // 8. Calculate new statistics
    const weeklyStats = calculateWeeklyStats(
      goals,
      recurringEvents,
      calendarEvents,
      weekOffset,
      totalAvailableHours
    );

    // 9. Generate new hash
    const snapshotHash = generateSnapshotHash(goals, recurringEvents);

    // 10. Update main snapshot
    const updateResult = await (supabase as any)
      .from('weekly_snapshots')
      .update({
        total_available_hours: totalAvailableHours,
        total_allocated_hours: weeklyStats.totalAllocatedHours,
        total_completed_hours: weeklyStats.totalCompletedHours,
        total_scheduled_hours: weeklyStats.totalScheduledHours,
        free_time_hours: weeklyStats.freeTimeHours,
        snapshot_hash: snapshotHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', snapshot.id)
      .select()
      .single();

    if (updateResult.error) throw updateResult.error;

    // 11. Delete old goal snapshots
    const deleteGoalsResult: any = await supabase
      .from('weekly_goal_snapshots')
      .delete()
      .eq('snapshot_id', snapshot.id);

    if (deleteGoalsResult.error) throw deleteGoalsResult.error;

    // 12. Delete old recurring event snapshots
    const deleteEventsResult: any = await supabase
      .from('weekly_recurring_event_snapshots')
      .delete()
      .eq('snapshot_id', snapshot.id);

    if (deleteEventsResult.error) throw deleteEventsResult.error;

    // 13. Create new goal snapshots
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

    // 14. Create new recurring event snapshots
    const goalToSnapshotMap = new Map(goalSnapshots.map((gs) => [gs.goal_id, gs.id]));

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

    // 15. Return updated snapshot
    return NextResponse.json({
      snapshot: updateResult.data,
      goalSnapshots,
      recurringEventSnapshots,
    });
  } catch (error: any) {
    console.error('Error recalculating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate snapshot', details: error.message },
      { status: 500 }
    );
  }
}
