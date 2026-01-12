/**
 * Time Entries API - List and Create
 *
 * GET /api/time-entries - List time entries for authenticated user with filters
 * POST /api/time-entries - Create new time entry (manual or from calendar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import type {
  TimeEntry,
  TimeEntryRow,
  CreateTimeEntryRequest,
} from '@/types/clockify';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Transform database row to application format
 */
function transformTimeEntryFromDb(row: any): any {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    goalId: row.goal_id,
    clockifyEntryId: row.clockify_entry_id,
    clockifyProjectId: row.clockify_project_id,
    isBillable: row.is_billable,
    source: row.source,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined data
    goal: row.goal_name ? {
      id: row.goal_id,
      name: row.goal_name,
      category: row.goal_category,
      iconUrl: row.goal_icon_url,
    } : undefined,
    clockifyProject: row.clockify_project_name ? {
      id: row.clockify_project_id,
      name: row.clockify_project_name,
      color: row.clockify_project_color,
    } : undefined,
  };
}

/**
 * GET /api/time-entries
 * Returns time entries for the authenticated user with optional filters
 * Query params: startDate, endDate, goalId, source, page, pageSize
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

    // 2. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 3. Get user ID
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

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const goalId = searchParams.get('goalId');
    const source = searchParams.get('source');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // 5. Use SQL function to get entries with details
    const { data, error } = await supabase.rpc('get_time_entries_with_details', {
      p_user_id: userId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_goal_id: goalId || null,
    });

    if (error) {
      console.error('Time entries fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time entries: ' + error.message },
        { status: 500 }
      );
    }

    // 6. Apply additional filters (source)
    let entries = data || [];

    if (source) {
      entries = entries.filter((entry: any) => entry.source === source);
    }

    // 7. Apply pagination
    const totalCount = entries.length;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEntries = entries.slice(startIndex, endIndex);

    // 8. Transform to application format
    const transformedEntries = paginatedEntries.map(transformTimeEntryFromDb);

    // 9. Return response
    return NextResponse.json({
      entries: transformedEntries,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error: any) {
    console.error('GET time entries error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch time entries',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/time-entries
 * Create a new time entry (manual or from calendar event)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: CreateTimeEntryRequest = await request.json();
    const {
      description,
      startTime,
      endTime,
      goalId,
      clockifyProjectId,
      isBillable = false,
      source = 'manual',
    } = body;

    // 3. Validate required fields
    if (!startTime) {
      return NextResponse.json(
        { error: 'Missing required field: startTime' },
        { status: 400 }
      );
    }

    // 4. Validate dates
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startTime format' },
        { status: 400 }
      );
    }

    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endTime format' },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          { error: 'endTime must be after startTime' },
          { status: 400 }
        );
      }
    }

    // 5. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 6. Get user ID
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

    // 7. Validate goal belongs to user (if provided)
    if (goalId) {
      const goalResult: any = await supabase
        .from('goals')
        .select('id')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (goalResult.error || !goalResult.data) {
        return NextResponse.json(
          { error: 'Goal not found or access denied' },
          { status: 404 }
        );
      }
    }

    // 8. Validate clockify project belongs to user (if provided)
    if (clockifyProjectId) {
      const projectResult: any = await supabase
        .from('clockify_projects')
        .select(`
          id,
          clockify_connections!inner (
            user_id
          )
        `)
        .eq('id', clockifyProjectId)
        .single();

      if (projectResult.error || !projectResult.data) {
        return NextResponse.json(
          { error: 'Clockify project not found' },
          { status: 404 }
        );
      }

      if (projectResult.data.clockify_connections.user_id !== userId) {
        return NextResponse.json(
          { error: 'Access denied to clockify project' },
          { status: 403 }
        );
      }
    }

    // 9. Prepare time entry data
    const timeEntryData = {
      user_id: userId,
      description: description || null,
      start_time: start.toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      goal_id: goalId || null,
      clockify_project_id: clockifyProjectId || null,
      is_billable: isBillable,
      source: source,
      sync_status: 'synced', // Manual entries are already "synced"
    };

    // 10. Insert time entry
    const insertResult: any = await supabase
      .from('time_entries')
      .insert(timeEntryData)
      .select()
      .single();

    if (insertResult.error) {
      console.error('Time entry insert error:', insertResult.error);
      return NextResponse.json(
        { error: 'Failed to create time entry: ' + insertResult.error.message },
        { status: 500 }
      );
    }

    // 11. Fetch full entry with details using SQL function
    const { data: fullEntry, error: fetchError } = await supabase.rpc(
      'get_time_entries_with_details',
      {
        p_user_id: userId,
        p_start_date: null,
        p_end_date: null,
        p_goal_id: null,
      }
    );

    if (fetchError || !fullEntry || fullEntry.length === 0) {
      // Fallback to basic data if fetch fails
      return NextResponse.json({
        success: true,
        entry: {
          id: insertResult.data.id,
          ...timeEntryData,
          createdAt: insertResult.data.created_at,
          updatedAt: insertResult.data.updated_at,
          durationSeconds: insertResult.data.duration_seconds,
        },
        message: 'Time entry created successfully',
      });
    }

    // Find the newly created entry in the results
    const newEntry = fullEntry.find((e: any) => e.id === insertResult.data.id);

    // 12. Return success response
    return NextResponse.json({
      success: true,
      entry: newEntry ? transformTimeEntryFromDb(newEntry) : insertResult.data,
      message: 'Time entry created successfully',
    });
  } catch (error: any) {
    console.error('POST time entry error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create time entry',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
