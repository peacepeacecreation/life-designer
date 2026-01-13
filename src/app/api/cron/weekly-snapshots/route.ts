/**
 * Cron Job API - Create Weekly Snapshots
 *
 * POST /api/cron/weekly-snapshots
 * Automatically creates snapshots for previous week for all users
 *
 * Should be called every Monday at 00:01
 * Requires CRON_SECRET for authorization
 */

import { NextRequest, NextResponse } from 'next/server';
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
export const maxDuration = 300; // 5 minutes for processing all users

/**
 * POST /api/cron/weekly-snapshots
 * Create snapshots for all users for previous week
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      console.error('❌ Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Cron job authorized');

    // 2. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get all users
    const usersResult: any = await supabase.from('users').select('id, email');

    if (usersResult.error) throw usersResult.error;

    const users = usersResult.data || [];
    console.log(`📊 Found ${users.length} users to process`);

    // 4. Process each user
    const weekOffset = -1; // Previous week
    const { weekStart, weekEnd } = getWeekBoundaries(weekOffset);

    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const user of users) {
      try {
        console.log(`\n🔄 Processing user: ${user.email}`);

        // Check if snapshot already exists
        const existingSnapshot: any = await supabase
          .from('weekly_snapshots')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStart.toISOString())
          .single();

        if (existingSnapshot.data) {
          console.log(`  ⏭️  Snapshot already exists, skipping`);
          results.skipped++;
          continue;
        }

        // Fetch user data
        const [goalsResult, recurringEventsResult, calendarEventsResult, settingsResult]: any[] =
          await Promise.all([
            supabase.from('goals').select('*').eq('user_id', user.id),
            supabase.from('recurring_events').select('*').eq('user_id', user.id),
            supabase.from('calendar_events').select('*').eq('user_id', user.id),
            supabase.from('global_settings').select('*').eq('user_id', user.id).single(),
          ]);

        if (goalsResult.error) throw goalsResult.error;
        if (recurringEventsResult.error) throw recurringEventsResult.error;
        if (calendarEventsResult.error) throw calendarEventsResult.error;

        const goals: Goal[] = goalsResult.data || [];
        const recurringEventsRaw: RecurringEventRow[] = recurringEventsResult.data || [];
        const recurringEvents: RecurringEvent[] = recurringEventsRaw.map(parseRecurringEventFromDb);
        const calendarEvents: CalendarEventWithGoal[] = calendarEventsResult.data || [];
        const totalAvailableHours = settingsResult.data?.weekly_available_hours || 112;

        console.log(`  📋 Goals: ${goals.length}, Events: ${recurringEvents.length}`);

        // Skip if user has no goals
        if (goals.length === 0) {
          console.log(`  ⏭️  No goals, skipping`);
          results.skipped++;
          continue;
        }

        // Calculate statistics
        const weeklyStats = calculateWeeklyStats(
          goals,
          recurringEvents,
          calendarEvents,
          weekOffset,
          totalAvailableHours
        );

        // Generate hash
        const snapshotHash = generateSnapshotHash(goals, recurringEvents);

        // Create main snapshot
        const snapshotResult: any = await (supabase as any)
          .from('weekly_snapshots')
          .insert({
            user_id: user.id,
            week_start_date: weekStart.toISOString(),
            week_end_date: weekEnd.toISOString(),
            total_available_hours: totalAvailableHours,
            total_allocated_hours: weeklyStats.totalAllocatedHours,
            total_completed_hours: weeklyStats.totalCompletedHours,
            total_scheduled_hours: weeklyStats.totalScheduledHours,
            free_time_hours: weeklyStats.freeTimeHours,
            is_frozen: false, // Auto-generated
            snapshot_hash: snapshotHash,
          })
          .select()
          .single();

        if (snapshotResult.error) throw snapshotResult.error;

        const snapshot = snapshotResult.data;

        // Create goal snapshots
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

        // Create recurring event snapshots
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

        await Promise.all(recurringEventSnapshotPromises);

        console.log(`  ✅ Snapshot created successfully`);
        results.created++;
      } catch (error: any) {
        console.error(`  ❌ Failed for user ${user.email}:`, error.message);
        results.failed++;
        results.errors.push({
          userId: user.id,
          email: user.email,
          error: error.message,
        });
      }
    }

    // 5. Return summary
    console.log('\n📊 Cron job completed:');
    console.log(`  Total users: ${results.total}`);
    console.log(`  Created: ${results.created}`);
    console.log(`  Skipped: ${results.skipped}`);
    console.log(`  Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/weekly-snapshots
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Weekly Snapshots Cron',
    status: 'operational',
    schedule: 'Every Monday at 00:01',
    endpoint: 'POST /api/cron/weekly-snapshots',
    auth: 'Bearer token required (CRON_SECRET)',
  });
}
