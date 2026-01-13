/**
 * Google Calendar Connection API
 *
 * Separate OAuth flow to request calendar permissions
 * This allows users to connect their calendar after initial sign-up
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

/**
 * GET /api/calendar/connect
 * Initiates OAuth flow for Google Calendar access
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build OAuth URL for calendar permissions
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: session.user.email, // Pass user email to verify in callback
    });

    const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Error initiating calendar connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
