/**
 * Clockify Auto-Sync API (Cron-triggered)
 * POST /api/integrations/clockify/auto-sync
 *
 * Automatically synchronizes time entries for active users
 * - Triggered by external cron service (cron-job.org)
 * - Batch processes users to stay within Vercel timeout (10s on free tier)
 * - Syncs CURRENT WEEK only (Monday 00:00 → now)
 * - Uses hash-based change detection for efficiency
 * - Prioritizes connections that haven't synced recently
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { decryptApiKey } from '@/lib/clockify/encryption';
import { generateTimeEntryHash } from '@/lib/clockify/hash';
import type { ClockifyTimeEntry } from '@/types/clockify';
import { startOfWeek } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 10; // Vercel Free tier limit

const BATCH_SIZE = 10; // Max users to sync per cron run

interface SyncStats {
  imported: number;
  updated: number;
  skipped: number;
}

interface BatchSyncResult {
  totalUsers: number;
  syncedUsers: number;
  totalImported: number;
  totalUpdated: number;
  totalSkipped: number;
  errors: string[];
}

interface ClockifyConnection {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  workspace_id: string;
  clockify_user_id: string;
  is_active: boolean;
  last_successful_sync_at: string | null;
  users: {
    id: string;
    email: string;
  };
}

/**
 * POST /api/integrations/clockify/auto-sync
 * Triggered by cron service
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('Auto-sync: Request received');

    // 1. Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    console.log('Auto-sync: Auth check', {
      hasAuthHeader: !!authHeader,
      hasEnvSecret: !!process.env.CRON_SECRET,
      authHeaderPrefix: authHeader?.substring(0, 10),
    });

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('Auto-sync: Unauthorized request', {
        reason: !authHeader ? 'No auth header' : 'Invalid secret',
        hasEnvSecret: !!process.env.CRON_SECRET,
      });
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: !process.env.CRON_SECRET ? 'CRON_SECRET not configured' : 'Invalid authorization'
        },
        { status: 401 }
      );
    }

    // 2. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 3. Get active Clockify connections
    // Prioritize connections that haven't synced recently (oldest first)
    const { data: connections, error: connectionsError } = await supabase
      .from('clockify_connections')
      .select(`
        id,
        user_id,
        api_key_encrypted,
        workspace_id,
        clockify_user_id,
        is_active,
        last_successful_sync_at,
        users!inner (
          id,
          email
        )
      `)
      .eq('is_active', true)
      .order('last_successful_sync_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE) as { data: ClockifyConnection[] | null; error: any };

    if (connectionsError) {
      console.error('Auto-sync: Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active connections to sync',
        totalUsers: 0,
        syncedUsers: 0,
      });
    }

    console.log(`Auto-sync: Found ${connections.length} active connections to sync`);

    // 4. Batch sync all active connections
    const result: BatchSyncResult = {
      totalUsers: connections.length,
      syncedUsers: 0,
      totalImported: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      errors: [],
    };

    for (const connection of connections) {
      try {
        const stats = await syncSingleConnection(supabase, connection);
        result.syncedUsers++;
        result.totalImported += stats.imported;
        result.totalUpdated += stats.updated;
        result.totalSkipped += stats.skipped;
      } catch (error: any) {
        console.error(`Auto-sync: Error syncing connection ${connection.id}:`, error);
        result.errors.push(`Connection ${connection.id}: ${error.message}`);
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    console.log(`Auto-sync completed in ${duration}s:`, result);

    return NextResponse.json({
      success: true,
      ...result,
      duration,
    });
  } catch (error: any) {
    console.error('Auto-sync: Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Auto-sync failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Sync a single user's Clockify connection
 */
async function syncSingleConnection(
  supabase: any,
  connection: ClockifyConnection
): Promise<SyncStats> {
  const connectionId = connection.id;
  const userId = connection.user_id;
  let syncLogId: string | undefined;

  try {
    // 1. Decrypt API key
    const apiKey = await decryptApiKey(connection.api_key_encrypted);
    const clockifyClient = getClockifyClient(apiKey);

    // 2. Create sync log
    const { data: syncLog } = await supabase
      .from('clockify_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: 'incremental',
        direction: 'import',
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    syncLogId = syncLog?.id;

    // 3. Update connection status
    await supabase
      .from('clockify_connections')
      .update({ sync_status: 'syncing' })
      .eq('id', connectionId);

    // 4. Initialize stats
    const stats: SyncStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
    };

    // 5. Cache projects (quick operation)
    await cacheProjects(supabase, clockifyClient, connection, connectionId);

    // 6. Import time entries (incremental)
    await importFromClockify(
      supabase,
      clockifyClient,
      connection,
      userId,
      stats
    );

    // 7. Update sync log with success
    if (syncLogId) {
      await supabase
        .from('clockify_sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          entries_imported: stats.imported,
          entries_updated: stats.updated,
          entries_skipped: stats.skipped,
        })
        .eq('id', syncLogId);
    }

    // 8. Update connection with success
    await supabase
      .from('clockify_connections')
      .update({
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq('id', connectionId);

    return stats;
  } catch (error: any) {
    console.error(`Error syncing connection ${connectionId}:`, error);

    // Update sync log with error
    if (syncLogId) {
      await supabase
        .from('clockify_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', syncLogId);
    }

    // Update connection with error
    await supabase
      .from('clockify_connections')
      .update({
        sync_status: 'error',
        last_sync_at: new Date().toISOString(),
        last_sync_error: error.message,
      })
      .eq('id', connectionId);

    throw error;
  }
}

/**
 * Cache Clockify projects
 */
async function cacheProjects(
  supabase: any,
  clockifyClient: any,
  connection: any,
  connectionId: string
): Promise<void> {
  try {
    const projects = await clockifyClient.getProjects(connection.workspace_id, false);

    for (const project of projects) {
      await supabase.from('clockify_projects').upsert(
        {
          connection_id: connectionId,
          clockify_project_id: project.id,
          name: project.name,
          client_name: project.clientName || null,
          color: project.color || null,
          is_archived: project.archived || false,
          fetched_at: new Date().toISOString(),
        },
        {
          onConflict: 'connection_id,clockify_project_id',
        }
      );
    }
  } catch (error) {
    console.error('Error caching projects:', error);
    // Don't fail sync if project caching fails
  }
}

/**
 * Import time entries from Clockify (current week with hash detection)
 */
async function importFromClockify(
  supabase: any,
  clockifyClient: any,
  connection: any,
  userId: string,
  stats: SyncStats
): Promise<void> {
  // Sync CURRENT WEEK only (Monday 00:00 → now)
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  console.log('Auto-sync: Syncing current week', {
    weekStart: weekStart.toISOString(),
    now: now.toISOString(),
  });

  // Fetch time entries from Clockify for current week
  const clockifyEntries = await clockifyClient.getTimeEntries(
    connection.workspace_id,
    connection.clockify_user_id,
    {
      start: weekStart.toISOString(),
      end: now.toISOString(),
      pageSize: 500,
    }
  );

  // Get project-to-goal mappings
  const { data: mappings } = await supabase
    .from('clockify_project_goal_mappings')
    .select(`
      goal_id,
      clockify_projects!inner (
        clockify_project_id
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  // Create map: clockify_project_id -> goal_id
  const projectToGoalMap = new Map<string, string>();
  for (const mapping of mappings || []) {
    const clockifyProjectId = mapping.clockify_projects?.clockify_project_id;
    if (clockifyProjectId) {
      projectToGoalMap.set(clockifyProjectId, mapping.goal_id);
    }
  }

  // Get clockify_projects lookup
  const { data: projects } = await supabase
    .from('clockify_projects')
    .select('id, clockify_project_id')
    .eq('connection_id', connection.id);

  const projectIdMap = new Map<string, string>();
  for (const project of projects || []) {
    projectIdMap.set(project.clockify_project_id, project.id);
  }

  // Import each entry
  for (const entry of clockifyEntries) {
    try {
      await importSingleEntry(
        supabase,
        entry,
        userId,
        projectToGoalMap,
        projectIdMap,
        stats
      );
    } catch (error) {
      console.error('Error importing entry:', entry.id, error);
      stats.skipped++;
    }
  }
}

/**
 * Import a single time entry with hash-based change detection
 */
async function importSingleEntry(
  supabase: any,
  entry: ClockifyTimeEntry,
  userId: string,
  projectToGoalMap: Map<string, string>,
  projectIdMap: Map<string, string>,
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
  const clockifyProjectDbId = entry.projectId ? projectIdMap.get(entry.projectId) : null;

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
    stats.imported++;
  } else {
    // Entry exists but hash changed → update
    await supabase
      .from('time_entries')
      .update(timeEntryData)
      .eq('id', existing.id);
    stats.updated++;
  }
}
