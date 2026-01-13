/**
 * Google Calendar OAuth Callback
 *
 * Handles the OAuth callback after user grants calendar permissions
 * Exchanges authorization code for access token and stores it
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * GET /api/calendar/callback
 * OAuth callback endpoint for calendar permissions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user email
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL('/calendar?error=access_denied', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/calendar?error=no_code', request.url)
      );
    }

    // Verify user is still authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(
        new URL('/calendar?error=unauthorized', request.url)
      );
    }

    // Verify state matches current user
    if (state !== session.user.email) {
      return NextResponse.redirect(
        new URL('/calendar?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(
        new URL('/calendar?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in database
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL('/calendar?error=database_unavailable', request.url)
      );
    }

    // Create or update calendar_tokens table entry
    const { error: dbError } = await (supabase as any)
      .from('calendar_tokens')
      .upsert({
        user_email: session.user.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_email'
      });

    if (dbError) {
      console.error('Database error storing tokens:', dbError);
      return NextResponse.redirect(
        new URL('/calendar?error=storage_failed', request.url)
      );
    }

    // Success! Redirect back to calendar page
    return NextResponse.redirect(
      new URL('/calendar?connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in calendar callback:', error);
    return NextResponse.redirect(
      new URL('/calendar?error=unknown', request.url)
    );
  }
}
