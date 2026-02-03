/**
 * Admin User Activity API
 *
 * GET /api/admin/users/[id]/activity - Get detailed user activity timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/check-admin';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

interface ActivityEvent {
  id: string;
  type: 'goal' | 'note' | 'reflection' | 'calendar_event' | 'canvas' | 'time_entry';
  action: 'created' | 'updated';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * GET /api/admin/users/[id]/activity
 * Returns detailed activity timeline and metrics for a specific user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check admin access
    const session = await checkAdminAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Await params (Next.js 15+)
    const params = await context.params;
    const userId = params.id;
    console.log('[Admin Activity API] Fetching activity for user ID:', userId);

    // 3. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 4. Get user info
    const userResult: any = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('[Admin Activity API] User query result:', {
      error: userResult.error,
      hasData: !!userResult.data,
    });

    if (userResult.error || !userResult.data) {
      console.error('[Admin Activity API] User not found:', userResult.error);
      return NextResponse.json(
        {
          error: 'User not found',
          details: userResult.error?.message || 'No user data returned',
          userId,
        },
        { status: 404 }
      );
    }

    const user = userResult.data;

    // 5. Fetch all activity data in parallel
    const [
      goalsResult,
      notesResult,
      reflectionsResult,
      eventsResult,
      canvasResult,
      timeEntriesResult,
    ]: any[] = await Promise.all([
      // Goals
      supabase
        .from('goals')
        .select('id, name, description, category, priority, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Notes
      supabase
        .from('notes')
        .select('id, title, content, note_type, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Reflections
      supabase
        .from('reflections')
        .select('id, title, content, reflection_type, reflection_date, mood_score, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Calendar Events
      supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Canvas Workspaces
      supabase
        .from('canvas_workspaces')
        .select('id, title, nodes, edges, created_at, last_modified_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Time Entries
      supabase
        .from('time_entries')
        .select('id, description, start_time, end_time, duration_minutes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    // 5. Build activity timeline
    const activities: ActivityEvent[] = [];

    // Add goals
    (goalsResult.data || []).forEach((goal: any) => {
      activities.push({
        id: goal.id,
        type: 'goal',
        action: 'created',
        title: goal.name,
        description: goal.description,
        timestamp: goal.created_at,
        metadata: {
          category: goal.category,
          priority: goal.priority,
          status: goal.status,
        },
      });

      if (goal.updated_at !== goal.created_at) {
        activities.push({
          id: `${goal.id}-updated`,
          type: 'goal',
          action: 'updated',
          title: goal.name,
          timestamp: goal.updated_at,
          metadata: { status: goal.status },
        });
      }
    });

    // Add notes
    (notesResult.data || []).forEach((note: any) => {
      activities.push({
        id: note.id,
        type: 'note',
        action: 'created',
        title: note.title,
        description: note.content?.substring(0, 100),
        timestamp: note.created_at,
        metadata: { note_type: note.note_type },
      });
    });

    // Add reflections
    (reflectionsResult.data || []).forEach((reflection: any) => {
      activities.push({
        id: reflection.id,
        type: 'reflection',
        action: 'created',
        title: reflection.title,
        description: reflection.content?.substring(0, 100),
        timestamp: reflection.created_at,
        metadata: {
          reflection_type: reflection.reflection_type,
          mood_score: reflection.mood_score,
        },
      });
    });

    // Add calendar events
    (eventsResult.data || []).forEach((event: any) => {
      activities.push({
        id: event.id,
        type: 'calendar_event',
        action: 'created',
        title: event.title,
        description: event.description,
        timestamp: event.created_at,
        metadata: {
          start_time: event.start_time,
          end_time: event.end_time,
        },
      });
    });

    // Add canvas workspaces
    (canvasResult.data || []).forEach((canvas: any) => {
      const nodesCount = Array.isArray(canvas.nodes) ? canvas.nodes.length : 0;
      const edgesCount = Array.isArray(canvas.edges) ? canvas.edges.length : 0;

      activities.push({
        id: canvas.id,
        type: 'canvas',
        action: 'created',
        title: canvas.title || 'Canvas',
        timestamp: canvas.created_at,
        metadata: {
          nodes_count: nodesCount,
          edges_count: edgesCount,
        },
      });

      if (canvas.last_modified_at !== canvas.created_at) {
        activities.push({
          id: `${canvas.id}-updated`,
          type: 'canvas',
          action: 'updated',
          title: canvas.title || 'Canvas',
          timestamp: canvas.last_modified_at,
          metadata: {
            nodes_count: nodesCount,
            edges_count: edgesCount,
          },
        });
      }
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 6. Calculate metrics
    const goals = goalsResult.data || [];
    const timeEntries = timeEntriesResult.data || [];

    const totalTimeMinutes = timeEntries.reduce(
      (sum: number, entry: any) => sum + (entry.duration_minutes || 0),
      0
    );

    // Calculate active days (days with any activity)
    const activityDates = new Set(
      activities.map(a => new Date(a.timestamp).toDateString())
    );

    // Calculate average goals per week
    const firstActivity = activities[activities.length - 1];
    const daysSinceFirstActivity = firstActivity
      ? Math.max(1, Math.ceil(
          (Date.now() - new Date(firstActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        ))
      : 1;
    const weeksSinceFirstActivity = daysSinceFirstActivity / 7;

    const metrics = {
      totalActiveDays: activityDates.size,
      totalTimeTrackedHours: Math.round(totalTimeMinutes / 60),
      averageGoalsPerWeek: weeksSinceFirstActivity > 0
        ? (goals.length / weeksSinceFirstActivity).toFixed(1)
        : '0',
      completionRate: goals.length > 0
        ? ((goals.filter((g: any) => g.status === 'completed').length / goals.length) * 100).toFixed(1)
        : '0',
      lastActivityDate: activities[0]?.timestamp || null,
      daysSinceRegistration: Math.ceil(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    };

    // 7. Get recent items for quick view
    const recentGoals = goals.slice(0, 5).map((g: any) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      priority: g.priority,
      category: g.category,
      created_at: g.created_at,
    }));

    const recentNotes = (notesResult.data || []).slice(0, 5).map((n: any) => ({
      id: n.id,
      title: n.title,
      note_type: n.note_type,
      created_at: n.created_at,
    }));

    const recentEvents = (eventsResult.data || []).slice(0, 5).map((e: any) => ({
      id: e.id,
      title: e.title,
      start_time: e.start_time,
      created_at: e.created_at,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      metrics,
      activities: activities.slice(0, 100), // Return last 100 activities
      recent: {
        goals: recentGoals,
        notes: recentNotes,
        events: recentEvents,
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/users/[id]/activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity', details: error.message },
      { status: 500 }
    );
  }
}
