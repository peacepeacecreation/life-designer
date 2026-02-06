/**
 * Clockify Current Timer API
 * GET /api/clockify/current-timer
 *
 * Fetches the currently running timer from Clockify
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { decryptApiKey } from '@/lib/clockify/encryption';

export const runtime = 'nodejs';
export const maxDuration = 10;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // 3. Get user ID
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

    // 4. Get user's Clockify connection
    const { data: connection, error: connectionError } = (await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single()) as { data: any; error: any };

    if (connectionError || !connection) {
      return NextResponse.json(
        { connected: false, timer: null }
      );
    }

    // 5. Decrypt API key
    const apiKey = await decryptApiKey(connection.api_key_encrypted);

    // 6. Create Clockify client
    const clockifyClient = getClockifyClient(apiKey);

    // 7. Fetch current running timer (get time entries without end time)
    const timeEntries = await clockifyClient.getTimeEntries(
      connection.workspace_id,
      connection.clockify_user_id,
      {
        pageSize: 1,
      }
    );

    // Find running timer (no end time)
    const runningTimer = timeEntries.find(entry => !entry.timeInterval.end);

    if (!runningTimer) {
      return NextResponse.json({
        connected: true,
        timer: null
      });
    }

    // 8. Get project-to-goal mapping
    let goalInfo = null;
    if (runningTimer.projectId) {
      const { data: mapping } = (await supabase
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
        .eq('is_active', true)
        .eq('clockify_projects.clockify_project_id', runningTimer.projectId)
        .single()) as { data: any };

      if (mapping) {
        goalInfo = {
          id: mapping.goals?.id,
          name: mapping.goals?.name,
          color: mapping.goals?.color,
        };
      }
    }

    // 9. Calculate duration
    const startTime = new Date(runningTimer.timeInterval.start);
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    // 10. Return timer info
    return NextResponse.json({
      connected: true,
      timer: {
        id: runningTimer.id,
        description: runningTimer.description,
        startTime: runningTimer.timeInterval.start,
        durationSeconds,
        projectId: runningTimer.projectId,
        goal: goalInfo,
      }
    });

  } catch (error: any) {
    console.error('Error fetching current timer:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch current timer',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
