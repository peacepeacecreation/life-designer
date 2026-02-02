import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { decryptApiKey } from '@/lib/clockify/encryption';
import { getClockifyClient } from '@/lib/clockify/client';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeEntryId } = await req.json();

    if (!timeEntryId) {
      return NextResponse.json(
        { error: 'timeEntryId is required' },
        { status: 400 }
      );
    }

    // Get database client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    // Get user ID
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

    // Get Clockify connection
    const connectionResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json(
        { error: 'Clockify не підключено' },
        { status: 404 }
      );
    }

    const connection = connectionResult.data;

    // Decrypt API key
    const apiKey = await decryptApiKey(connection.api_key_encrypted);
    const clockifyClient = getClockifyClient(apiKey);

    // Delete time entry via Clockify API
    await clockifyClient.deleteTimeEntry(
      connection.workspace_id,
      timeEntryId
    );

    return NextResponse.json({
      success: true,
      message: 'Time entry deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting timer:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
