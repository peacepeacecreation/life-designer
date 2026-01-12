/**
 * Clockify Validate API
 * POST /api/integrations/clockify/validate
 *
 * Validates Clockify API key and returns available workspaces
 * Used during connection setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClockifyClient } from '@/lib/clockify/client';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/integrations/clockify/validate
 * Validate API key and fetch workspaces
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid apiKey' },
        { status: 400 }
      );
    }

    // Create Clockify client
    const clockifyClient = getClockifyClient(apiKey);

    // Validate API key by fetching user info
    const user = await clockifyClient.getCurrentUser();

    // Fetch workspaces
    const workspaces = await clockifyClient.getWorkspaces();

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspaces: workspaces.map(w => ({
        id: w.id,
        name: w.name,
      })),
    });
  } catch (error: any) {
    console.error('Validate error:', error);

    // Check if it's an authentication error
    if (error.message.includes('Authentication failed')) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to validate API key',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
