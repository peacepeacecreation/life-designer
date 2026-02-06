/**
 * Canvas Events API
 *
 * GET /api/canvas/events?canvasId=xxx - Get events for a canvas
 * POST /api/canvas/events - Track a new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/canvas/events?canvasId=xxx&limit=100
 * Get activity events for a canvas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get('canvasId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!canvasId) {
      return NextResponse.json(
        { error: 'canvasId is required' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get events for this canvas
    const { data: events, error } = await supabase
      .from('canvas_events')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    if (error) {
      console.error('Error fetching canvas events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error('Error in GET /api/canvas/events:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/canvas/events
 * Track a new canvas event
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { canvasId, eventType, targetId, eventData, slotId } = body;

    // Validate
    if (!canvasId || !eventType || !targetId) {
      return NextResponse.json(
        { error: 'canvasId, eventType, and targetId are required' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get user_id from session
    const { data: user } = (await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()) as { data: { id: string } | null };

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Insert event
    const { data: event, error } = await (supabase as any)
      .from('canvas_events')
      .insert({
        canvas_id: canvasId,
        user_id: user.id,
        event_type: eventType,
        target_id: targetId,
        event_data: eventData || {},
        slot_id: slotId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting canvas event:', error);
      return NextResponse.json(
        { error: 'Failed to track event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Error in POST /api/canvas/events:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
