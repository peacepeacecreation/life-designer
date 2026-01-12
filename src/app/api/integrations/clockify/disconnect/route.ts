/**
 * Clockify Disconnect API
 * POST /api/integrations/clockify/disconnect
 *
 * Disconnects user's Clockify workspace
 * - Sets connection to inactive (soft delete)
 * - Preserves time entries and sync history
 * - Can be reconnected later
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/integrations/clockify/disconnect
 * Disconnect user's Clockify connection
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
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId' },
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

    // 5. Verify connection belongs to user
    const connResult: any = await supabase
      .from('clockify_connections')
      .select('id, is_active')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connResult.error || !connResult.data) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    if (!connResult.data.is_active) {
      return NextResponse.json(
        { error: 'Connection is already disconnected' },
        { status: 400 }
      );
    }

    // 6. Soft delete: set is_active = false
    const updateResult: any = await (supabase as any)
      .from('clockify_connections')
      .update({
        is_active: false,
        sync_status: 'pending',
        auto_sync_enabled: false,
      })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (updateResult.error) {
      console.error('Disconnect error:', updateResult.error);
      return NextResponse.json(
        { error: 'Failed to disconnect: ' + updateResult.error.message },
        { status: 500 }
      );
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'Clockify connection disconnected successfully',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
