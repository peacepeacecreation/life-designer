/**
 * Canvas Autosave API
 *
 * POST /api/canvas/autosave - Save canvas (upsert)
 * GET /api/canvas/autosave - Load saved canvas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/canvas/autosave
 * Saves canvas data (creates new or updates existing)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { nodes, edges, title } = body;

    // 3. Validate required fields
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Invalid data: nodes and edges must be arrays' },
        { status: 400 }
      );
    }

    // 4. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 5. Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // 6. Check if canvas already exists for this user
    const existingResult: any = await supabase
      .from('canvas_workspaces')
      .select('id')
      .eq('user_id', userId)
      .single();

    let canvasId: string;
    let action: 'created' | 'updated';

    if (existingResult.data) {
      // UPDATE existing canvas
      canvasId = existingResult.data.id;
      const updateResult: any = await (supabase as any)
        .from('canvas_workspaces')
        .update({
          nodes,
          edges,
          ...(title && { title }),
        })
        .eq('id', canvasId)
        .select('id')
        .single();

      if (updateResult.error) {
        console.error('Error updating canvas:', updateResult.error);
        throw updateResult.error;
      }

      action = 'updated';
    } else {
      // INSERT new canvas
      const insertResult: any = await (supabase as any)
        .from('canvas_workspaces')
        .insert({
          user_id: userId,
          nodes,
          edges,
          title: title || 'Робочий Canvas',
        })
        .select('id')
        .single();

      if (insertResult.error) {
        console.error('Error creating canvas:', insertResult.error);
        throw insertResult.error;
      }

      canvasId = insertResult.data.id;
      action = 'created';
    }

    return NextResponse.json({
      success: true,
      canvasId,
      action,
    });

  } catch (error: any) {
    console.error('Error in POST /api/canvas/autosave:', error);
    return NextResponse.json(
      { error: 'Failed to save canvas', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/canvas/autosave
 * Loads the saved canvas for the authenticated user
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
      // New user - return empty canvas
      return NextResponse.json({
        nodes: [],
        edges: [],
        title: 'Робочий Canvas',
        exists: false,
      });
    }

    const userId = userResult.data.id;

    // 4. Fetch canvas workspace
    const canvasResult: any = await supabase
      .from('canvas_workspaces')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (canvasResult.error || !canvasResult.data) {
      // Canvas doesn't exist yet - return empty
      return NextResponse.json({
        nodes: [],
        edges: [],
        title: 'Робочий Canvas',
        exists: false,
      });
    }

    const canvas = canvasResult.data;

    return NextResponse.json({
      nodes: canvas.nodes || [],
      edges: canvas.edges || [],
      title: canvas.title || 'Робочий Canvas',
      canvasId: canvas.id,
      lastModified: canvas.last_modified_at,
      exists: true,
    });

  } catch (error: any) {
    console.error('Error in GET /api/canvas/autosave:', error);
    return NextResponse.json(
      { error: 'Failed to load canvas', details: error.message },
      { status: 500 }
    );
  }
}
