/**
 * Clockify Project-Goal Mappings API
 * GET /api/integrations/clockify/mappings - List all mappings
 * POST /api/integrations/clockify/mappings - Create new mapping
 * DELETE /api/integrations/clockify/mappings?id=... - Delete mapping
 *
 * Maps Clockify projects to Life Designer goals
 * Used during sync to automatically categorize time entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/integrations/clockify/mappings
 * List all project-goal mappings for authenticated user
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

    // 4. Fetch mappings with joined project and goal info
    const mappingsResult: any = await supabase
      .from('clockify_project_goal_mappings')
      .select(`
        id,
        is_active,
        auto_categorize,
        created_at,
        updated_at,
        clockify_projects (
          id,
          clockify_project_id,
          name,
          client_name,
          color,
          is_archived
        ),
        goals (
          id,
          name,
          category,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (mappingsResult.error) {
      console.error('Mappings fetch error:', mappingsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch mappings: ' + mappingsResult.error.message },
        { status: 500 }
      );
    }

    // 5. Transform data for frontend
    const mappings = mappingsResult.data.map((mapping: any) => ({
      id: mapping.id,
      isActive: mapping.is_active,
      autoCategorize: mapping.auto_categorize,
      createdAt: mapping.created_at,
      updatedAt: mapping.updated_at,
      project: mapping.clockify_projects ? {
        id: mapping.clockify_projects.id,
        clockifyProjectId: mapping.clockify_projects.clockify_project_id,
        name: mapping.clockify_projects.name,
        clientName: mapping.clockify_projects.client_name,
        color: mapping.clockify_projects.color,
        isArchived: mapping.clockify_projects.is_archived,
      } : null,
      goal: mapping.goals ? {
        id: mapping.goals.id,
        name: mapping.goals.name,
        category: mapping.goals.category,
        iconUrl: mapping.goals.icon_url,
      } : null,
    }));

    return NextResponse.json({ mappings });
  } catch (error: any) {
    console.error('GET mappings error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch mappings',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/clockify/mappings
 * Create new project-goal mapping
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
    const body = await request.json();
    const { clockifyProjectId, goalId, autoCategorize = true } = body;

    if (!clockifyProjectId || typeof clockifyProjectId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid clockifyProjectId' },
        { status: 400 }
      );
    }

    if (!goalId || typeof goalId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid goalId' },
        { status: 400 }
      );
    }

    // 3. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 4. Get user ID
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

    // 5. Verify project belongs to user (via connection)
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
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (projectResult.data.clockify_connections.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied to project' },
        { status: 403 }
      );
    }

    // 6. Verify goal belongs to user
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

    // 7. Create mapping
    const mappingData = {
      user_id: userId,
      clockify_project_id: clockifyProjectId,
      goal_id: goalId,
      is_active: true,
      auto_categorize: autoCategorize,
    };

    const mappingResult: any = await (supabase as any)
      .from('clockify_project_goal_mappings')
      .insert(mappingData)
      .select()
      .single();

    if (mappingResult.error) {
      console.error('Mapping insert error:', mappingResult.error);

      // Check for unique constraint violation
      if (mappingResult.error.code === '23505') {
        return NextResponse.json(
          { error: 'Mapping already exists for this project and goal' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create mapping: ' + mappingResult.error.message },
        { status: 500 }
      );
    }

    // 8. Return success
    return NextResponse.json({
      success: true,
      mapping: {
        id: mappingResult.data.id,
        clockifyProjectId: mappingResult.data.clockify_project_id,
        goalId: mappingResult.data.goal_id,
        isActive: mappingResult.data.is_active,
        autoCategorize: mappingResult.data.auto_categorize,
        createdAt: mappingResult.data.created_at,
      },
      message: 'Mapping created successfully',
    });
  } catch (error: any) {
    console.error('POST mapping error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create mapping',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/clockify/mappings?id=...
 * Delete a project-goal mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Get mapping ID from query params
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Missing mapping id parameter' },
        { status: 400 }
      );
    }

    // 3. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 4. Get user ID
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

    // 5. Delete mapping (RLS will ensure user owns it)
    const deleteResult: any = await supabase
      .from('clockify_project_goal_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('user_id', userId);

    if (deleteResult.error) {
      console.error('Mapping delete error:', deleteResult.error);
      return NextResponse.json(
        { error: 'Failed to delete mapping: ' + deleteResult.error.message },
        { status: 500 }
      );
    }

    // 6. Return success
    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE mapping error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete mapping',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
