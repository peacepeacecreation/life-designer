/**
 * Snapshot Change Detection API
 *
 * GET /api/snapshots/check-changes?weekOffset=-1
 * Check if data has changed since snapshot was created
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { generateSnapshotHash, getWeekBoundaries } from '@/utils/snapshotHelpers';
import { Goal } from '@/types';
import { RecurringEvent, parseRecurringEventFromDb, RecurringEventRow } from '@/types/recurring-events';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/snapshots/check-changes?weekOffset=-1
 * Returns change status for a specific week's snapshot
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
      .select('id, snapshot_hash, updated_at')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString())
      .single();

    // If no snapshot exists
    if (snapshotResult.error || !snapshotResult.data) {
      return NextResponse.json({
        hasSnapshot: false,
        hasChanges: false,
        canRecalculate: false,
      });
    }

    const snapshot = snapshotResult.data;

    // 7. Fetch current data
    const [goalsResult, recurringEventsResult]: any[] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('recurring_events').select('*').eq('user_id', userId),
    ]);

    if (goalsResult.error) throw goalsResult.error;
    if (recurringEventsResult.error) throw recurringEventsResult.error;

    const goals: Goal[] = goalsResult.data || [];
    const recurringEventsRaw: RecurringEventRow[] = recurringEventsResult.data || [];
    const recurringEvents: RecurringEvent[] = recurringEventsRaw.map(parseRecurringEventFromDb);

    // 8. Generate current hash
    const currentHash = generateSnapshotHash(goals, recurringEvents);

    // 9. Compare hashes
    const hasChanges = snapshot.snapshot_hash !== currentHash;

    return NextResponse.json({
      hasSnapshot: true,
      hasChanges,
      lastUpdated: snapshot.updated_at,
      canRecalculate: weekOffset < 0, // Can only recalculate past weeks
    });
  } catch (error: any) {
    console.error('Error checking snapshot changes:', error);
    return NextResponse.json(
      { error: 'Failed to check changes', details: error.message },
      { status: 500 }
    );
  }
}
