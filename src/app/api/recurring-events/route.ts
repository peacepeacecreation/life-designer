import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

// GET /api/recurring-events - List all recurring events for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user_id from session email
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const isActiveOnly = searchParams.get('active') === 'true';
    const goalId = searchParams.get('goalId');

    // Build query
    let query = (supabase as any)
      .from('recurring_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    const { data: recurringEvents, error } = await query;

    if (error) {
      console.error('Error fetching recurring events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurringEvents: recurringEvents || [] });
  } catch (error: any) {
    console.error('Error in GET /api/recurring-events:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/recurring-events - Create new recurring event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user_id from session email
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.start_time || !body.duration || !body.frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, duration, frequency' },
        { status: 400 }
      );
    }

    // Prepare data for insertion
    const eventData = {
      user_id: userId,
      title: body.title,
      description: body.description || null,
      start_time: body.start_time,
      duration: body.duration,
      frequency: body.frequency,
      interval: body.interval || 1,
      days_of_week: body.days_of_week || null,
      end_date: body.end_date || null,
      recurrence_count: body.recurrence_count || null,
      color: body.color || null,
      goal_id: body.goal_id || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    const { data: recurringEvent, error } = await (supabase as any)
      .from('recurring_events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('Error creating recurring event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurringEvent }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/recurring-events:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
