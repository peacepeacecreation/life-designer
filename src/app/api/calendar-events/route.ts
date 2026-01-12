/**
 * Calendar Events API - List and Create
 *
 * GET /api/calendar-events - List calendar events for authenticated user
 * POST /api/calendar-events - Create new calendar event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import type {
  CalendarEvent,
  CalendarEventRow,
  CalendarEventWithGoal,
  CreateCalendarEventInput,
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
 * GET /api/calendar-events
 * Returns calendar events for the authenticated user
 * Query params: startDate, endDate (ISO strings for filtering)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.data;

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const goalId = searchParams.get('goalId');

    // 5. Build query with filters
    let query = supabase
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
      .eq('user_id', userData.id)
      .order('start_time', { ascending: true });

    // Apply date range filter if provided
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    // Apply goal filter if provided
    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    const eventsResult: any = await query;

    const { data: events, error } = eventsResult;

    if (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }

    console.log('📅 Fetched calendar events:', {
      count: events?.length || 0,
      user_id: userData.id,
      filters: { startDate, endDate, goalId }
    });

    // 6. Transform to frontend format
    const formattedEvents: CalendarEventWithGoal[] = (events || []).map((e: any) =>
      transformEventFromDb(e, e.goals)
    );

    return NextResponse.json({ events: formattedEvents });
  } catch (error: any) {
    console.error('Error in GET /api/calendar-events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar-events
 * Creates a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: CreateCalendarEventInput = await request.json();
    console.log('📥 Received calendar event request:', JSON.stringify(body, null, 2));

    const {
      title,
      description,
      location,
      startTime,
      endTime,
      allDay,
      goalId,
      color,
    } = body;

    // 3. Validate required fields
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!startTime) missingFields.push('startTime');
    if (!endTime) missingFields.push('endTime');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      );
    }

    // 4. Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // 5. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 6. Get or create user
    let userId: string;
    const existingUserResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (existingUserResult.data) {
      userId = existingUserResult.data.id;
    } else {
      // Create user if doesn't exist
      const newUserResult: any = await (supabase as any)
        .from('users')
        .insert({ email: session.user.email })
        .select('id')
        .single();

      if (newUserResult.error || !newUserResult.data) {
        throw new Error('Failed to create user');
      }
      userId = newUserResult.data.id;
    }

    // 7. Validate goalId if provided
    if (goalId) {
      const goalCheck: any = await supabase
        .from('goals')
        .select('id, user_id')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (goalCheck.error || !goalCheck.data) {
        return NextResponse.json(
          { error: 'Goal not found or access denied' },
          { status: 403 }
        );
      }
    }

    // 8. Insert calendar event into database
    const insertResult: any = await (supabase as any)
      .from('calendar_events')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        location: location || null,
        start_time: ensureDateString(startTime),
        end_time: ensureDateString(endTime),
        all_day: allDay || false,
        goal_id: goalId || null,
        color: color || null,
      })
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

    const { data: event, error: insertError } = insertResult;

    if (insertError) {
      console.error('Error inserting calendar event:', insertError);
      throw insertError;
    }

    // 9. Transform to frontend format
    const formattedEvent = transformEventFromDb(event, event.goals);

    console.log('✅ Created calendar event:', {
      id: formattedEvent.id,
      title: formattedEvent.title,
      goalId: formattedEvent.goalId
    });

    return NextResponse.json({ event: formattedEvent }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/calendar-events:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event', details: error.message },
      { status: 500 }
    );
  }
}
