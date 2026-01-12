/**
 * Regenerate Embeddings API
 *
 * POST /api/goals/regenerate-embeddings - Regenerate embeddings for all goals without them
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';

export const runtime = 'nodejs';
export const maxDuration = 60; // Longer timeout for bulk operations

/**
 * POST /api/goals/regenerate-embeddings
 * Regenerates embeddings for all user's goals that don't have one
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID from email
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.data;

    // 4. Fetch all goals without embeddings
    const goalsResult: any = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userData.id)
      .is('embedding', null);

    const { data: goalsWithoutEmbeddings, error: fetchError } = goalsResult;

    if (fetchError) {
      console.error('Error fetching goals:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${goalsWithoutEmbeddings?.length || 0} goals without embeddings`);

    if (!goalsWithoutEmbeddings || goalsWithoutEmbeddings.length === 0) {
      return NextResponse.json({
        message: 'All goals already have embeddings',
        updated: 0
      });
    }

    // 5. Generate and update embeddings for each goal
    const results = [];
    for (const goal of goalsWithoutEmbeddings) {
      try {
        const goalForEmbedding = {
          name: goal.name,
          description: goal.description,
          category: goal.category,
          priority: goal.priority,
          status: goal.status,
          tags: goal.tags || [],
        };

        const embedding = await embeddingService.generateGoalEmbedding(goalForEmbedding);

        const updateResult: any = await (supabase as any)
          .from('goals')
          .update({ embedding })
          .eq('id', goal.id);

        if (updateResult.error) {
          console.error(`Failed to update embedding for goal ${goal.id}:`, updateResult.error);
          results.push({ id: goal.id, name: goal.name, success: false, error: updateResult.error.message });
        } else {
          console.log(`Updated embedding for goal: ${goal.name}`);
          results.push({ id: goal.id, name: goal.name, success: true });
        }
      } catch (err: any) {
        console.error(`Error generating embedding for goal ${goal.id}:`, err);
        results.push({ id: goal.id, name: goal.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${results.length} goals`,
      updated: successCount,
      failed: failCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in POST /api/goals/regenerate-embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate embeddings', details: error.message },
      { status: 500 }
    );
  }
}
