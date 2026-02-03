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
    const { canvasId, nodes, edges, title } = body;

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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = (userData as any).id;

    let finalCanvasId: string;
    let action: 'created' | 'updated';

    if (canvasId) {
      // 6a. Якщо canvasId надано - оновити цей canvas
      const { data: existingCanvas, error: checkError } = await supabase
        .from('canvas_workspaces')
        .select('id')
        .eq('id', canvasId)
        .eq('user_id', userId)
        .single();

      if (checkError || !existingCanvas) {
        return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
      }

      finalCanvasId = canvasId;

      // Оновити canvas
      const { error: updateError } = await supabase
        .from('canvas_workspaces')
        // @ts-expect-error - Supabase types issue
        .update({
          nodes,
          edges,
          ...(title && { title }),
        } as any)
        .eq('id', finalCanvasId);

      if (updateError) {
        console.error('Error updating canvas:', updateError);
        throw updateError;
      }

      action = 'updated';
    } else {
      // 6b. Якщо canvasId НЕ надано - знайти останній canvas або створити новий
      const { data: lastCanvas } = await supabase
        .from('canvas_workspaces')
        .select('id')
        .eq('user_id', userId)
        .order('last_modified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastCanvas) {
        // Оновити останній canvas
        finalCanvasId = (lastCanvas as any).id;

        const { error: updateError } = await supabase
          .from('canvas_workspaces')
          // @ts-expect-error - Supabase types issue
          .update({
            nodes,
            edges,
            ...(title && { title }),
          } as any)
          .eq('id', finalCanvasId);

        if (updateError) {
          console.error('Error updating canvas:', updateError);
          throw updateError;
        }

        action = 'updated';
      } else {
        // Створити новий canvas
        const { data: newCanvas, error: insertError } = await supabase
          .from('canvas_workspaces')
          .insert({
            user_id: userId,
            nodes,
            edges,
            title: title || 'Робочий Canvas',
          } as any)
          .select('id')
          .single();

        if (insertError || !newCanvas) {
          console.error('Error creating canvas:', insertError);
          throw insertError;
        }

        finalCanvasId = (newCanvas as any).id;
        action = 'created';
      }
    }

    return NextResponse.json({
      success: true,
      canvasId: finalCanvasId,
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

    // 2. Get canvasId from query params (optional)
    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get('canvasId');

    // 3. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 4. Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      // New user - return empty canvas
      return NextResponse.json({
        nodes: [],
        edges: [],
        title: 'Робочий Canvas',
        exists: false,
      });
    }

    const userId = (userData as any).id;

    if (canvasId) {
      // 5a. Завантажити конкретний canvas
      const { data: canvas, error } = await supabase
        .from('canvas_workspaces')
        .select('*')
        .eq('id', canvasId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !canvas) {
        return NextResponse.json({
          nodes: [],
          edges: [],
          title: 'Робочий Canvas',
          exists: false,
        });
      }

      return NextResponse.json({
        nodes: (canvas as any).nodes || [],
        edges: (canvas as any).edges || [],
        title: (canvas as any).title || 'Робочий Canvas',
        canvasId: (canvas as any).id,
        lastModified: (canvas as any).last_modified_at,
        exists: true,
      });
    } else {
      // 5b. Завантажити останній змінений canvas
      const { data: canvas } = await supabase
        .from('canvas_workspaces')
        .select('*')
        .eq('user_id', userId)
        .order('last_modified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!canvas) {
        return NextResponse.json({
          nodes: [],
          edges: [],
          title: 'Робочий Canvas',
          exists: false,
        });
      }

      return NextResponse.json({
        nodes: (canvas as any).nodes || [],
        edges: (canvas as any).edges || [],
        title: (canvas as any).title || 'Робочий Canvas',
        canvasId: (canvas as any).id,
        lastModified: (canvas as any).last_modified_at,
        exists: true,
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/canvas/autosave:', error);
    return NextResponse.json(
      { error: 'Failed to load canvas', details: error.message },
      { status: 500 }
    );
  }
}
