/**
 * Time Entry Single API - Get, Update, Delete
 *
 * GET /api/time-entries/[id] - Get single time entry
 * PUT /api/time-entries/[id] - Update time entry
 * DELETE /api/time-entries/[id] - Delete time entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import type { UpdateTimeEntryRequest } from '@/types/clockify';

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
 * GET /api/time-entries/[id]
 * Get a single time entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 4. Fetch time entry with details using SQL function
    const { data, error } = await supabase.rpc('get_time_entries_with_details', {
      p_user_id: userId,
      p_start_date: null,
      p_end_date: null,
      p_goal_id: null,
    });

    if (error) {
      console.error('Time entry fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time entry: ' + error.message },
        { status: 500 }
      );
    }

    // 5. Find the specific entry
    const entry = data?.find((e: any) => e.id === id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    // 6. Return entry
    return NextResponse.json({
      entry: transformTimeEntryFromDb(entry),
    });
  } catch (error: any) {
    console.error('GET time entry error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch time entry',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/time-entries/[id]
 * Update a time entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: UpdateTimeEntryRequest = await request.json();
    const {
      description,
      startTime,
      endTime,
      goalId,
      clockifyProjectId,
      isBillable,
    } = body;

    // 3. Validate dates if provided
    if (startTime) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startTime format' },
          { status: 400 }
        );
      }
    }

    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endTime format' },
          { status: 400 }
        );
      }
    }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        return NextResponse.json(
          { error: 'endTime must be after startTime' },
          { status: 400 }
        );
      }
    }

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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    // 6. Verify entry belongs to user and get current data
    const currentResult: any = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (currentResult.error || !currentResult.data) {
      return NextResponse.json(
        { error: 'Time entry not found or access denied' },
        { status: 404 }
      );
    }

    const currentEntry = currentResult.data;

    // 7. Validate goal belongs to user (if provided and changed)
    if (goalId && goalId !== currentEntry.goal_id) {
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

    // 8. Validate clockify project (if provided and changed)
    if (clockifyProjectId && clockifyProjectId !== currentEntry.clockify_project_id) {
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

    // 9. Prepare update data (only include provided fields)
    const updateData: any = {};

    if (description !== undefined) updateData.description = description || null;
    if (startTime !== undefined) updateData.start_time = new Date(startTime).toISOString();
    if (endTime !== undefined) updateData.end_time = endTime ? new Date(endTime).toISOString() : null;
    if (goalId !== undefined) updateData.goal_id = goalId || null;
    if (clockifyProjectId !== undefined) updateData.clockify_project_id = clockifyProjectId || null;
    if (isBillable !== undefined) updateData.is_billable = isBillable;

    // 10. Mark as pending_push if it's a Clockify entry (for future export)
    if (currentEntry.source === 'clockify' && currentEntry.clockify_entry_id) {
      updateData.sync_status = 'pending_push';
    }

    // 11. Update time entry
    const updateResult: any = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateResult.error) {
      console.error('Time entry update error:', updateResult.error);
      return NextResponse.json(
        { error: 'Failed to update time entry: ' + updateResult.error.message },
        { status: 500 }
      );
    }

    // 12. Fetch full entry with details
    const { data: fullEntry } = await supabase.rpc(
      'get_time_entries_with_details',
      {
        p_user_id: userId,
        p_start_date: null,
        p_end_date: null,
        p_goal_id: null,
      }
    );

    const updatedEntry = fullEntry?.find((e: any) => e.id === id);

    // 13. Return success response
    return NextResponse.json({
      success: true,
      entry: updatedEntry ? transformTimeEntryFromDb(updatedEntry) : updateResult.data,
      message: 'Time entry updated successfully',
    });
  } catch (error: any) {
    console.error('PUT time entry error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update time entry',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/time-entries/[id]
 * Delete a time entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 4. Delete time entry (RLS will ensure user owns it)
    const deleteResult: any = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteResult.error) {
      console.error('Time entry delete error:', deleteResult.error);
      return NextResponse.json(
        { error: 'Failed to delete time entry: ' + deleteResult.error.message },
        { status: 500 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Time entry deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE time entry error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete time entry',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
