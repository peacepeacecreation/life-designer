/**
 * Clockify Projects API
 * GET /api/integrations/clockify/projects
 *
 * Returns cached Clockify projects for the user's connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/integrations/clockify/projects
 * Get cached Clockify projects for user's connection
 * Query params: connectionId (optional)
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

    // 4. Get connectionId from query params (optional)
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    // 5. Build query for projects
    let query = supabase
      .from('clockify_projects')
      .select(`
        id,
        clockify_project_id,
        name,
        client_name,
        color,
        is_archived,
        fetched_at,
        clockify_connections!inner (
          user_id
        )
      `)
      .eq('clockify_connections.user_id', userId);

    // Filter by connection if provided
    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    // Order by name
    query = query.order('name', { ascending: true });

    const projectsResult: any = await query;

    if (projectsResult.error) {
      console.error('Projects fetch error:', projectsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch projects: ' + projectsResult.error.message },
        { status: 500 }
      );
    }

    // 6. Transform data
    const projects = (projectsResult.data || []).map((project: any) => ({
      id: project.id,
      clockifyProjectId: project.clockify_project_id,
      name: project.name,
      clientName: project.client_name,
      color: project.color,
      isArchived: project.is_archived,
      fetchedAt: project.fetched_at,
    }));

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
