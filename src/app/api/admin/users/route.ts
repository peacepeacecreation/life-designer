/**
 * Admin Users API
 *
 * GET /api/admin/users - Get all users (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/check-admin';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/admin/users
 * Returns list of all users with their stats
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check admin access
    const session = await checkAdminAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Ensure current admin user exists in database
    const currentUserEmail = session.user?.email;
    if (currentUserEmail) {
      const existingUserResult: any = await supabase
        .from('users')
        .select('id')
        .eq('email', currentUserEmail)
        .maybeSingle();

      if (!existingUserResult.data) {
        console.log('[Admin Users API] Creating admin user:', currentUserEmail);
        const insertResult: any = await supabase
          .from('users')
          .insert({ email: currentUserEmail })
          .select()
          .single();

        if (insertResult.error) {
          console.error('[Admin Users API] Failed to create user:', insertResult.error);
        }
      }
    }

    // 4. Get all users
    const usersResult: any = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error);
      throw usersResult.error;
    }

    const users = usersResult.data || [];

    // 5. For each user, get their stats
    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        // Get goals count
        const goalsResult: any = await supabase
          .from('goals')
          .select('id, status', { count: 'exact', head: false })
          .eq('user_id', user.id);

        const goals = goalsResult.data || [];
        const goalsCount = goals.length;
        const completedGoalsCount = goals.filter((g: any) => g.status === 'completed').length;
        const activeGoalsCount = goals.filter((g: any) => g.status === 'in_progress').length;

        // Get notes count
        const notesResult: any = await supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const notesCount = notesResult.count || 0;

        // Get reflections count
        const reflectionsResult: any = await supabase
          .from('reflections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const reflectionsCount = reflectionsResult.count || 0;

        // Get calendar events count
        const eventsResult: any = await supabase
          .from('calendar_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const eventsCount = eventsResult.count || 0;

        return {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          stats: {
            goals: goalsCount,
            activeGoals: activeGoalsCount,
            completedGoals: completedGoalsCount,
            notes: notesCount,
            reflections: reflectionsCount,
            events: eventsCount,
          },
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      total: usersWithStats.length,
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
