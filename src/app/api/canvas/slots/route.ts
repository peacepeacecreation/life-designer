/**
 * Canvas Save Slots API
 *
 * GET /api/canvas/slots?canvasId=xxx - Get all slots for a canvas
 * POST /api/canvas/slots - Save to a slot
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/canvas/slots?canvasId=xxx
 * Get all save slots for a canvas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get('canvasId');

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

    // Get all slots for this canvas
    const { data: slots, error } = await supabase
      .from('canvas_save_slots')
      .select('*')
      .eq('canvas_id', canvasId)
      .order('slot_number', { ascending: true });

    if (error) {
      console.error('Error fetching slots:', error);
      return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }

    return NextResponse.json({ slots: slots || [] });
  } catch (error: any) {
    console.error('Error in GET /api/canvas/slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/canvas/slots
 * Save current canvas to a specific slot
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { canvasId, slotNumber, nodes, edges, slotName } = body;

    // Validate
    if (!canvasId || !slotNumber) {
      return NextResponse.json(
        { error: 'canvasId and slotNumber are required' },
        { status: 400 }
      );
    }

    if (slotNumber < 1 || slotNumber > 5) {
      return NextResponse.json(
        { error: 'slotNumber must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'nodes and edges must be arrays' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Call save_to_slot function
    const { data, error } = await (supabase as any).rpc('save_to_slot', {
      p_canvas_id: canvasId,
      p_slot_number: slotNumber,
      p_nodes: nodes,
      p_edges: edges,
      p_slot_name: slotName || null,
    });

    if (error) {
      console.error('Error saving to slot:', error);
      return NextResponse.json(
        { error: 'Failed to save to slot', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slotId: data,
      slotNumber,
    });
  } catch (error: any) {
    console.error('Error in POST /api/canvas/slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/canvas/slots
 * Delete a save slot
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json(
        { error: 'slotId is required' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { error } = await supabase
      .from('canvas_save_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('Error deleting slot:', error);
      return NextResponse.json(
        { error: 'Failed to delete slot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/canvas/slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
