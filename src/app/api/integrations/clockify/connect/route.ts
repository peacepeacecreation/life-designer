/**
 * Clockify Connect API
 * POST /api/integrations/clockify/connect
 *
 * Establishes connection between user and their Clockify workspace
 * - Validates API key by fetching user info from Clockify
 * - Encrypts and stores API key securely in database
 * - Triggers initial sync (async, non-blocking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { getClockifyClient } from '@/lib/clockify/client';
import { encryptApiKey } from '@/lib/clockify/encryption';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/integrations/clockify/connect
 * Connect user's Clockify workspace
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

    // 2. Parse and validate request body
    const body = await request.json();
    const { apiKey, workspaceId } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid apiKey' },
        { status: 400 }
      );
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid workspaceId' },
        { status: 400 }
      );
    }

    // 3. Validate API key by calling Clockify API
    let clockifyUser;
    let workspace;

    try {
      const clockifyClient = getClockifyClient(apiKey);

      // Fetch current user to validate API key
      clockifyUser = await clockifyClient.getCurrentUser();

      // Fetch workspaces to verify workspace access
      const workspaces = await clockifyClient.getWorkspaces();
      workspace = workspaces.find(w => w.id === workspaceId);

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found or access denied' },
          { status: 403 }
        );
      }
    } catch (error: any) {
      console.error('Clockify API validation error:', error);

      // Provide user-friendly error messages
      if (error.message.includes('Authentication failed')) {
        return NextResponse.json(
          { error: 'Invalid Clockify API key' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to connect to Clockify: ' + error.message },
        { status: 500 }
      );
    }

    // 4. Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // 5. Get user ID from database
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      console.error('User lookup error:', userResult.error);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;

    // 6. Encrypt API key
    let encryptedApiKey;
    try {
      encryptedApiKey = await encryptApiKey(apiKey);
    } catch (error: any) {
      console.error('Encryption error:', error);
      return NextResponse.json(
        { error: 'Failed to encrypt API key: ' + error.message },
        { status: 500 }
      );
    }

    // 7. Create or update connection in database
    const connectionData = {
      user_id: userId,
      api_key_encrypted: encryptedApiKey,
      workspace_id: workspaceId,
      clockify_user_id: clockifyUser.id,
      is_active: true,
      sync_status: 'pending',
      auto_sync_enabled: true,
      sync_direction: 'import_only',
      sync_frequency_minutes: 30,
    };

    const connectionResult: any = await supabase
      .from('clockify_connections')
      .upsert(connectionData, {
        onConflict: 'user_id,workspace_id',
      })
      .select()
      .single();

    if (connectionResult.error) {
      console.error('Database insert error:', connectionResult.error);
      return NextResponse.json(
        { error: 'Failed to save connection: ' + connectionResult.error.message },
        { status: 500 }
      );
    }

    // 8. Trigger initial sync (async, non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3077';
    fetch(`${appUrl}/api/integrations/clockify/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionResult.data.id,
        syncType: 'full',
      }),
    }).catch(err => {
      console.error('Failed to trigger initial sync:', err);
      // Don't fail the connection if sync trigger fails
    });

    // 9. Return success response
    return NextResponse.json({
      success: true,
      connection: {
        id: connectionResult.data.id,
        workspaceId: workspaceId,
        workspaceName: workspace.name,
        clockifyUserId: clockifyUser.id,
        clockifyUserEmail: clockifyUser.email,
        syncStatus: 'pending',
        isActive: true,
      },
      message: 'Connection established successfully. Initial sync started.',
    });
  } catch (error: any) {
    console.error('Connect error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to Clockify',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
