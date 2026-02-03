/**
 * Admin Test Database API
 *
 * GET /api/admin/test-db - Test database connection and check users
 */

import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/check-admin';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET() {
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

    // 3. Get all users
    const usersResult: any = await supabase
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    console.log('[Admin Test DB] Users query result:', {
      error: usersResult.error,
      count: usersResult.data?.length,
      users: usersResult.data,
    });

    if (usersResult.error) {
      return NextResponse.json({
        success: false,
        error: usersResult.error.message,
        details: usersResult.error,
      });
    }

    // 4. Check if current user exists in database
    const currentUserEmail = session.user?.email;
    const currentUserExists = usersResult.data?.find(
      (u: any) => u.email === currentUserEmail
    );

    // 5. If current user doesn't exist, create them
    if (!currentUserExists && currentUserEmail) {
      console.log('[Admin Test DB] Creating user:', currentUserEmail);

      const insertResult: any = await supabase
        .from('users')
        .insert({ email: currentUserEmail } as any)
        .select()
        .single();

      if (insertResult.error) {
        console.error('[Admin Test DB] Failed to create user:', insertResult.error);
      } else {
        console.log('[Admin Test DB] User created:', insertResult.data);
        usersResult.data.unshift(insertResult.data);
      }
    }

    return NextResponse.json({
      success: true,
      currentUser: {
        email: currentUserEmail,
        existsInDb: !!currentUserExists,
      },
      totalUsers: usersResult.data?.length || 0,
      users: usersResult.data || [],
    });

  } catch (error: any) {
    console.error('[Admin Test DB] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
