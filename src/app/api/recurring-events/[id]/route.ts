import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

// GET /api/recurring-events/[id] - Get single recurring event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: recurringEvent, error } = await (supabase as any)
      .from('recurring_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching recurring event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recurringEvent) {
      return NextResponse.json({ error: 'Recurring event not found' }, { status: 404 });
    }

    return NextResponse.json({ recurringEvent });
  } catch (error: any) {
    console.error('Error in GET /api/recurring-events/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/recurring-events/[id] - Update recurring event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Prepare update data (only include fields that are present in body)
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.start_time !== undefined) updateData.start_time = body.start_time;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.interval !== undefined) updateData.interval = body.interval;
    if (body.days_of_week !== undefined) updateData.days_of_week = body.days_of_week;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.recurrence_count !== undefined) updateData.recurrence_count = body.recurrence_count;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.goal_id !== undefined) updateData.goal_id = body.goal_id;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: recurringEvent, error } = await (supabase as any)
      .from('recurring_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating recurring event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recurringEvent) {
      return NextResponse.json({ error: 'Recurring event not found' }, { status: 404 });
    }

    return NextResponse.json({ recurringEvent });
  } catch (error: any) {
    console.error('Error in PATCH /api/recurring-events/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring-events/[id] - Delete recurring event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await (supabase as any)
      .from('recurring_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting recurring event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Recurring event deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/recurring-events/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
