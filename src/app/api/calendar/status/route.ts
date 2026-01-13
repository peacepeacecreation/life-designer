/**
 * Calendar Connection Status API
 *
 * Checks if user has connected their Google Calendar
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

/**
 * GET /api/calendar/status
 * Returns whether user has connected their Google Calendar
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has calendar tokens
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { data: token, error } = await (supabase as any)
      .from('calendar_tokens')
      .select('id, expires_at, scope')
      .eq('user_email', session.user.email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is OK
      console.error('Error checking calendar status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isConnected = !!token;
    const isExpired = token && new Date(token.expires_at) < new Date();

    return NextResponse.json({
      connected: isConnected && !isExpired,
      expired: isExpired,
      scopes: token?.scope?.split(' ') || [],
    });
  } catch (error) {
    console.error('Error in calendar status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
