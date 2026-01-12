/**
 * Calendar Events API - Individual Event Operations
 *
 * GET /api/calendar-events/:id - Get single event
 * PATCH /api/calendar-events/:id - Update event
 * DELETE /api/calendar-events/:id - Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import type {
  CalendarEventRow,
  CalendarEventWithGoal,
  UpdateCalendarEventInput,
} from '@/types/calendar-events';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Safely convert a date value to ISO string or pass through if already a string
 */
function ensureDateString(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  try {
    return new Date(date as any).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Transform database row (snake_case) to frontend format (camelCase)
 */
function transformEventFromDb(row: CalendarEventRow, goal?: any): CalendarEventWithGoal {
  const event: CalendarEventWithGoal = {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    location: row.location,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    allDay: row.all_day,
    goalId: row.goal_id,
    color: row.color,
    googleEventId: row.google_event_id,
    googleCalendarId: row.google_calendar_id,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  // Add goal information if available
  if (goal) {
    event.goal = {
      id: goal.id,
      name: goal.name,
      category: goal.category,
      iconUrl: goal.icon_url,
    };
  }

  return event;
}

/**
 * GET /api/calendar-events/:id
 * Returns a single calendar event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Fetch event with goal information
    const result: any = await supabase
      .from('calendar_events')
      .select(`
        *,
        goals (
          id,
          name,
          category,
          icon_url
        )
      `)
      .eq('id', id)
      .single();

    if (result.error || !result.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = result.data;

    // 3. Verify user owns this event
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || event.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Transform to frontend format
    const formattedEvent = transformEventFromDb(event, event.goals);

    return NextResponse.json({ event: formattedEvent });
  } catch (error: any) {
    console.error('Error in GET /api/calendar-events/:id:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar-events/:id
 * Updates a calendar event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: UpdateCalendarEventInput = await request.json();

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 4. Check if event exists and user owns it
    const existingResult: any = await supabase
      .from('calendar_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (existingResult.error || !existingResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existingResult.data.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Validate time range if both times are being updated
    if (body.startTime && body.endTime) {
      const start = new Date(body.startTime);
      const end = new Date(body.endTime);
      if (end <= start) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // 6. Validate goalId if provided
    if (body.goalId !== undefined) {
      if (body.goalId === null) {
        // Allow null to remove goal association
      } else {
        const goalCheck: any = await supabase
          .from('goals')
          .select('id, user_id')
          .eq('id', body.goalId)
          .eq('user_id', userId)
          .single();

        if (goalCheck.error || !goalCheck.data) {
          return NextResponse.json(
            { error: 'Goal not found or access denied' },
            { status: 403 }
          );
        }
      }
    }

    // 7. Build update object (only include provided fields)
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.startTime !== undefined) updateData.start_time = ensureDateString(body.startTime);
    if (body.endTime !== undefined) updateData.end_time = ensureDateString(body.endTime);
    if (body.allDay !== undefined) updateData.all_day = body.allDay;
    if (body.goalId !== undefined) updateData.goal_id = body.goalId;
    if (body.color !== undefined) updateData.color = body.color || null;

    // 8. Update event
    const updateResult: any = await (supabase as any)
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        goals (
          id,
          name,
          category,
          icon_url
        )
      `)
      .single();

    if (updateResult.error) {
      console.error('Error updating calendar event:', updateResult.error);
      throw updateResult.error;
    }

    // 9. Transform to frontend format
    const formattedEvent = transformEventFromDb(updateResult.data, updateResult.data.goals);

    console.log('✅ Updated calendar event:', {
      id: formattedEvent.id,
      title: formattedEvent.title,
    });

    return NextResponse.json({ event: formattedEvent });
  } catch (error: any) {
    console.error('Error in PATCH /api/calendar-events/:id:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar-events/:id
 * Deletes a calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 3. Check if event exists and user owns it
    const existingResult: any = await supabase
      .from('calendar_events')
      .select('user_id, title')
      .eq('id', id)
      .single();

    if (existingResult.error || !existingResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existingResult.data.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Delete event
    const deleteResult: any = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (deleteResult.error) {
      console.error('Error deleting calendar event:', deleteResult.error);
      throw deleteResult.error;
    }

    console.log('🗑️  Deleted calendar event:', {
      id,
      title: existingResult.data.title,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/calendar-events/:id:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event', details: error.message },
      { status: 500 }
    );
  }
}
