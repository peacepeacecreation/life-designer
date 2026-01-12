/**
 * Clockify Sync API
 * POST /api/integrations/clockify/sync
 *
 * Synchronizes time entries from Clockify to Life Designer
 * - Fetches and caches projects from Clockify
 * - Imports time entries (full or incremental)
 * - Maps projects to goals via project_goal_mappings
 * - Logs sync operations for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { decryptApiKey } from '@/lib/clockify/encryption';
import type { ClockifyTimeEntry } from '@/types/clockify';

export const runtime = 'nodejs';
export const maxDuration = 60; // Sync can take longer

interface SyncStats {
  imported: number;
  updated: number;
  skipped: number;
}

/**
 * POST /api/integrations/clockify/sync
 * Trigger manual or automatic sync
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let connectionId: string | undefined;
  let syncLogId: string | undefined;

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await request.json();
    const { connectionId: reqConnectionId, syncType = 'incremental' } = body;

    if (!reqConnectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId' },
        { status: 400 }
      );
    }

    connectionId = reqConnectionId;

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

    // 5. Get connection from database
    const connResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connResult.error || !connResult.data) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    const connection = connResult.data;

    if (!connection.is_active) {
      return NextResponse.json(
        { error: 'Connection is inactive' },
        { status: 400 }
      );
    }

    // 6. Decrypt API key
    let apiKey: string;
    try {
      apiKey = await decryptApiKey(connection.api_key_encrypted);
    } catch (error: any) {
      console.error('Decryption error:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt API key: ' + error.message },
        { status: 500 }
      );
    }

    // 7. Create Clockify client
    const clockifyClient = getClockifyClient(apiKey);

    // 8. Create sync log entry
    const syncLogResult: any = await supabase
      .from('clockify_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        direction: 'import',
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    syncLogId = syncLogResult.data?.id;

    // 9. Update connection status to 'syncing'
    await supabase
      .from('clockify_connections')
      .update({ sync_status: 'syncing' })
      .eq('id', connectionId);

    // 10. Initialize stats
    const stats: SyncStats = {
      imported: 0,
      updated: 0,
      skipped: 0,
    };

    // 11. Fetch and cache projects
    await cacheProjects(supabase, clockifyClient, connection, connectionId);

    // 12. Import time entries from Clockify
    await importFromClockify(
      supabase,
      clockifyClient,
      connection,
      userId,
      syncType,
      stats
    );

    // 13. Update sync log with success
    const duration = Math.floor((Date.now() - startTime) / 1000);
    await supabase
      .from('clockify_sync_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        entries_imported: stats.imported,
        entries_updated: stats.updated,
        entries_skipped: stats.skipped,
      })
      .eq('id', syncLogId);

    // 14. Update connection with success
    await supabase
      .from('clockify_connections')
      .update({
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq('id', connectionId);

    // 15. Return success response
    return NextResponse.json({
      success: true,
      stats,
      duration,
      message: `Sync completed: ${stats.imported} imported, ${stats.updated} updated, ${stats.skipped} skipped`,
    });
  } catch (error: any) {
    console.error('Sync error:', error);

    // Update sync log with error
    if (syncLogId) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const supabase = getServerClient();
      await supabase
        ?.from('clockify_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          error_message: error.message,
        })
        .eq('id', syncLogId);
    }

    // Update connection with error
    if (connectionId) {
      const supabase = getServerClient();
      await supabase
        ?.from('clockify_connections')
        .update({
          sync_status: 'error',
          last_sync_at: new Date().toISOString(),
          last_sync_error: error.message,
        })
        .eq('id', connectionId);
    }

    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch projects from Clockify and cache in database
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
      await (supabase as any).from('clockify_projects').upsert(
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
 * Import time entries from Clockify
 */
async function importFromClockify(
  supabase: any,
  clockifyClient: any,
  connection: any,
  userId: string,
  syncType: string,
  stats: SyncStats
): Promise<void> {
  // Determine date range based on sync type
  let startDate: string;

  if (syncType === 'full') {
    // Full sync: last 90 days
    const date = new Date();
    date.setDate(date.getDate() - 90);
    startDate = date.toISOString();
  } else {
    // Incremental: since last successful sync (or last 7 days as fallback)
    if (connection.last_successful_sync_at) {
      startDate = connection.last_successful_sync_at;
    } else {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      startDate = date.toISOString();
    }
  }

  const endDate = new Date().toISOString();

  // Fetch time entries from Clockify
  const clockifyEntries = await clockifyClient.getTimeEntries(
    connection.workspace_id,
    connection.clockify_user_id,
    {
      start: startDate,
      end: endDate,
      pageSize: 500, // Max page size
    }
  );

  // Get project-to-goal mappings
  const mappingsResult: any = await supabase
    .from('clockify_project_goal_mappings')
    .select(`
      goal_id,
      clockify_projects!inner (
        clockify_project_id
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  const mappings = mappingsResult.data || [];

  // Create a map: clockify_project_id -> goal_id
  const projectToGoalMap = new Map<string, string>();
  for (const mapping of mappings) {
    const clockifyProjectId = mapping.clockify_projects?.clockify_project_id;
    if (clockifyProjectId) {
      projectToGoalMap.set(clockifyProjectId, mapping.goal_id);
    }
  }

  // Get clockify_projects lookup: clockify_project_id -> id (UUID)
  const projectsResult: any = await supabase
    .from('clockify_projects')
    .select('id, clockify_project_id')
    .eq('connection_id', connection.id);

  const projectIdMap = new Map<string, string>();
  for (const project of projectsResult.data || []) {
    projectIdMap.set(project.clockify_project_id, project.id);
  }

  // Import each time entry
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
 * Import a single time entry
 */
async function importSingleEntry(
  supabase: any,
  entry: ClockifyTimeEntry,
  userId: string,
  projectToGoalMap: Map<string, string>,
  projectIdMap: Map<string, string>,
  stats: SyncStats
): Promise<void> {
  // Check if entry already exists
  const existingResult: any = await supabase
    .from('time_entries')
    .select('id, updated_at')
    .eq('user_id', userId)
    .eq('clockify_entry_id', entry.id)
    .maybeSingle();

  // Map Clockify project to goal
  const goalId = entry.projectId ? projectToGoalMap.get(entry.projectId) : null;

  // Get internal project UUID
  const clockifyProjectId = entry.projectId ? projectIdMap.get(entry.projectId) : null;

  // Prepare time entry data
  const timeEntryData = {
    user_id: userId,
    description: entry.description || null,
    start_time: entry.timeInterval.start,
    end_time: entry.timeInterval.end || null,
    clockify_entry_id: entry.id,
    clockify_project_id: clockifyProjectId,
    is_billable: entry.billable || false,
    goal_id: goalId,
    source: 'clockify',
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
  };

  if (!existingResult.data) {
    // Insert new entry
    const insertResult = await supabase
      .from('time_entries')
      .insert(timeEntryData);

    if (insertResult.error) {
      throw insertResult.error;
    }

    stats.imported++;
  } else {
    // Update existing entry
    const updateResult = await supabase
      .from('time_entries')
      .update(timeEntryData)
      .eq('id', existingResult.data.id);

    if (updateResult.error) {
      throw updateResult.error;
    }

    stats.updated++;
  }
}
