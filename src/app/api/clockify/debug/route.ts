import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single();

    if (userResult.error) {
      return NextResponse.json({
        step: 'user_lookup',
        error: userResult.error.message,
        email: session.user.email,
      });
    }

    const userId = userResult.data.id;

    // Get all connections for this user
    const connectionsResult: any = await supabase
      .from('clockify_connections')
      .select('*')
      .eq('user_id', userId);

    return NextResponse.json({
      user: {
        id: userId,
        email: session.user.email,
      },
      connections: {
        total: connectionsResult.data?.length || 0,
        active: connectionsResult.data?.filter((c: any) => c.is_active).length || 0,
        data: connectionsResult.data || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
