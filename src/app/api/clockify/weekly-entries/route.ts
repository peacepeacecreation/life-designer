/**
 * Clockify Weekly Entries API
 * GET /api/clockify/weekly-entries?weekStart=2026-01-13
 *
 * Fetches time entries from Clockify API for a specific week
 * Uses the user's stored Clockify connection and API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { decryptApiKey } from '@/lib/clockify/encryption';
import { startOfWeek, endOfWeek } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 10;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get week start from query params
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart');

    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'Missing weekStart parameter' },
        { status: 400 }
      );
    }

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

    console.log('Weekly entries request:', {
      weekStartParam,
      parsedDate: weekStartDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      userEmail: session.user.email,
    });

    // 3. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 4. Get user ID
    const { data: userData, error: userError } = (await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()) as { data: { id: string } | null; error: any };

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 5. Get user's Clockify connection
    const { data: connection, error: connectionError } = (await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single()) as { data: any; error: any };

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No active Clockify connection found' },
        { status: 404 }
      );
    }

    // 6. Decrypt API key
    const apiKey = await decryptApiKey(connection.api_key_encrypted);

    // 7. Create Clockify client
    const clockifyClient = getClockifyClient(apiKey);

    // 8. Fetch time entries from Clockify
    const timeEntries = await clockifyClient.getTimeEntries(
      connection.workspace_id,
      connection.clockify_user_id,
      {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        pageSize: 500,
      }
    );

    console.log('Received from Clockify API:', timeEntries.length, 'entries');

    // 9. Get project-to-goal mappings for enrichment
    const { data: mappings } = await supabase
      .from('clockify_project_goal_mappings')
      .select(`
        goal_id,
        goals!inner (
          id,
          name,
          color
        ),
        clockify_projects!inner (
          clockify_project_id,
          name
        )
      `)
      .eq('user_id', userData.id)
      .eq('is_active', true);

    // Create mapping lookup
    const projectToGoalMap = new Map();
    const projectNameMap = new Map();

    (mappings || []).forEach((mapping: any) => {
      const projectId = mapping.clockify_projects?.clockify_project_id;
      if (projectId) {
        projectToGoalMap.set(projectId, {
          id: mapping.goals?.id,
          name: mapping.goals?.name,
          color: mapping.goals?.color,
        });
        projectNameMap.set(projectId, mapping.clockify_projects?.name);
      }
    });

    // 10. Transform and enrich entries
    const enrichedEntries = timeEntries.map((entry: any) => {
      const goal = entry.projectId ? projectToGoalMap.get(entry.projectId) : null;
      const projectName = entry.projectId ? projectNameMap.get(entry.projectId) : null;

      // Calculate duration in seconds
      let durationSeconds = 0;
      if (entry.timeInterval.end) {
        const start = new Date(entry.timeInterval.start);
        const end = new Date(entry.timeInterval.end);
        durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      }

      return {
        id: entry.id,
        description: entry.description || null,
        start_time: entry.timeInterval.start,
        end_time: entry.timeInterval.end || null,
        duration_seconds: durationSeconds,
        is_billable: entry.billable || false,
        goal_id: goal?.id || null,
        goal_name: goal?.name || null,
        goal_color: goal?.color || null,
        clockify_project_id: entry.projectId || null,
        clockify_project_name: projectName || null,
        tags: entry.tags || [],
      };
    });

    // 11. Return enriched entries
    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      entries: enrichedEntries,
      totalEntries: enrichedEntries.length,
    });

  } catch (error: any) {
    console.error('Error fetching weekly entries:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch entries',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
