import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { goalOrders } = body as { goalOrders: { id: string; displayOrder: number }[] };

    if (!goalOrders || !Array.isArray(goalOrders)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected goalOrders array.' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;

    // Update each goal's display_order
    const updates = goalOrders.map(({ id, displayOrder }) =>
      (supabase as any)
        .from('goals')
        .update({ display_order: displayOrder })
        .eq('id', id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering goals:', error);
    return NextResponse.json(
      { error: 'Failed to reorder goals' },
      { status: 500 }
    );
  }
}
