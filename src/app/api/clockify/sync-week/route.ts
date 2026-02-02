/**
 * Clockify Week Sync API
 * POST /api/clockify/sync-week
 *
 * Synchronizes a specific week of time entries from Clockify
 * - Uses hash-based change detection to avoid unnecessary updates
 * - Syncs Monday 00:00 to Sunday 23:59 of the specified week
 * - Upserts entries into time_entries table
 * - Maps projects to goals automatically
 *
 * Request body:
 * {
 *   "weekStart": "2026-01-13T00:00:00.000Z"  // Monday of the week to sync
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "weekStart": "2026-01-13T00:00:00.000Z",
 *   "weekEnd": "2026-01-19T23:59:59.999Z",
 *   "stats": {
 *     "total": 42,
 *     "inserted": 5,
 *     "updated": 2,
 *     "skipped": 35
 *   },
 *   "duration": 1234  // ms
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { decryptApiKey } from '@/lib/clockify/encryption';
import { generateTimeEntryHash } from '@/lib/clockify/hash';
import { startOfWeek, endOfWeek } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 10;

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { weekStart: weekStartParam } = body;

    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'Missing weekStart parameter' },
        { status: 400 }
      );
    }

    // 3. Calculate week boundaries (Monday 00:00 to Sunday 23:59)
    // Parse date - support both ISO timestamps and YYYY-MM-DD format
    let weekStartDate: Date;
    if (weekStartParam.includes('T')) {
      // ISO timestamp - parse and get local date
      weekStartDate = new Date(weekStartParam);
    } else {
      // YYYY-MM-DD format - parse as local date at midnight
      const [year, month, day] = weekStartParam.split('-').map(Number);
      weekStartDate = new Date(year, month - 1, day, 0, 0, 0);
    }

    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    console.log('Sync week:', {
      weekStartParam,
      parsedDate: weekStartDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      user: session.user.email,
    });

    // 4. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 5. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.data;

    // 6. Get user's Clockify connection
    const connectionResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single();

    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json(
        { error: 'No active Clockify connection found' },
        { status: 404 }
      );
    }

    const connection = connectionResult.data;

    // 7. Decrypt API key and create Clockify client
    const apiKey = await decryptApiKey(connection.api_key_encrypted);
    const clockifyClient = getClockifyClient(apiKey);

    // 8. Fetch time entries from Clockify for this week
    const timeEntries = await clockifyClient.getTimeEntries(
      connection.workspace_id,
      connection.clockify_user_id,
      {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        pageSize: 500,
      }
    );

    console.log(`Fetched ${timeEntries.length} entries from Clockify`);

    // 9. Get project-to-goal mappings
    const { data: mappings } = await supabase
      .from('clockify_project_goal_mappings')
      .select(
        `
        goal_id,
        goals!inner (
          id,
          name,
          color
        ),
        clockify_projects!inner (
          id,
          clockify_project_id,
          name
        )
      `
      )
      .eq('user_id', userData.id)
      .eq('is_active', true);

    // Create mapping lookups
    const projectToGoalMap = new Map();
    const projectIdToDbIdMap = new Map();

    (mappings || []).forEach((mapping: any) => {
      const clockifyProjectId = mapping.clockify_projects?.clockify_project_id;
      if (clockifyProjectId) {
        projectToGoalMap.set(clockifyProjectId, mapping.goal_id);
        projectIdToDbIdMap.set(
          clockifyProjectId,
          mapping.clockify_projects.id
        );
      }
    });

    // 10. Sync entries with hash-based change detection
    const stats: SyncStats = {
      total: timeEntries.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };

    for (const entry of timeEntries) {
      try {
        await syncSingleEntry(
          supabase,
          entry,
          userData.id,
          projectToGoalMap,
          projectIdToDbIdMap,
          stats
        );
      } catch (error: any) {
        console.error('Error syncing entry:', entry.id, error);
        stats.skipped++;
      }
    }

    const duration = Date.now() - startTime;

    console.log('Sync completed:', stats, `(${duration}ms)`);

    // 11. Update connection last_sync_at
    const updateData = {
      last_sync_at: new Date().toISOString(),
      last_successful_sync_at: new Date().toISOString(),
    };
    await (supabase as any)
      .from('clockify_connections')
      .update(updateData)
      .eq('id', connection.id);

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      stats,
      duration,
    });
  } catch (error: any) {
    console.error('Sync week error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync week',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Sync a single time entry with hash-based change detection
 */
async function syncSingleEntry(
  supabase: any,
  entry: any,
  userId: string,
  projectToGoalMap: Map<string, string>,
  projectIdToDbIdMap: Map<string, string>,
  stats: SyncStats
): Promise<void> {
  // 1. Generate hash for the entry
  const contentHash = await generateTimeEntryHash({
    description: entry.description || null,
    start_time: entry.timeInterval?.start || null,
    end_time: entry.timeInterval?.end || null,
    project_id: entry.projectId || null,
  });

  // 2. Check if entry exists in database
  const { data: existing } = await supabase
    .from('time_entries')
    .select('id, content_hash')
    .eq('user_id', userId)
    .eq('clockify_entry_id', entry.id)
    .maybeSingle();

  // 3. If entry exists and hash matches → skip (no changes)
  if (existing && existing.content_hash === contentHash) {
    stats.skipped++;
    return;
  }

  // 4. Map project to goal
  const goalId = entry.projectId ? projectToGoalMap.get(entry.projectId) : null;
  const clockifyProjectDbId = entry.projectId
    ? projectIdToDbIdMap.get(entry.projectId)
    : null;

  // 5. Prepare entry data
  const timeEntryData = {
    user_id: userId,
    description: entry.description || null,
    start_time: entry.timeInterval.start,
    end_time: entry.timeInterval.end || null,
    clockify_entry_id: entry.id,
    clockify_project_id: clockifyProjectDbId,
    is_billable: entry.billable || false,
    goal_id: goalId,
    source: 'clockify',
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    content_hash: contentHash, // Store hash for future comparisons
  };

  // 6. Insert or update
  if (!existing) {
    // New entry → insert
    await supabase.from('time_entries').insert(timeEntryData);
    stats.inserted++;
  } else {
    // Entry exists but hash changed → update
    await supabase
      .from('time_entries')
      .update(timeEntryData)
      .eq('id', existing.id);
    stats.updated++;
  }
}
