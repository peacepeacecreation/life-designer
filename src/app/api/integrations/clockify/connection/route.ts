/**
 * Clockify Connection API
 * GET /api/integrations/clockify/connection
 *
 * Returns the current user's Clockify connection if exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/integrations/clockify/connection
 * Get user's active Clockify connection
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

    // 4. Get active connection
    const connectionResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connectionResult.error) {
      if (connectionResult.error.code === 'PGRST116') {
        // No connection found
        return NextResponse.json(
          { error: 'No active connection' },
          { status: 404 }
        );
      }

      throw connectionResult.error;
    }

    const connection = connectionResult.data;

    // 5. Return connection (without encrypted API key)
    return NextResponse.json({
      connection: {
        id: connection.id,
        workspaceId: connection.workspace_id,
        clockifyUserId: connection.clockify_user_id,
        syncStatus: connection.sync_status,
        lastSyncAt: connection.last_sync_at,
        lastSuccessfulSyncAt: connection.last_successful_sync_at,
        isActive: connection.is_active,
        autoSyncEnabled: connection.auto_sync_enabled,
        syncDirection: connection.sync_direction,
        syncFrequencyMinutes: connection.sync_frequency_minutes,
        // Note: We don't return api_key_encrypted for security
      },
    });
  } catch (error: any) {
    console.error('Get connection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch connection',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
