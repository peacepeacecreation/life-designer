/**
 * Reflections API - Individual Reflection Operations
 *
 * GET /api/reflections/:id - Get single reflection
 * PATCH /api/reflections/:id - Update reflection (with conditional embedding regeneration)
 * DELETE /api/reflections/:id - Delete reflection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Reflection, ReflectionType } from '@/types/reflections';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/reflections/:id
 * Returns a single reflection by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Fetch reflection
    // Type cast to bypass Supabase's complex type inference issues
    const reflectionResult: any = await supabase
      .from('reflections')
      .select('*')
      .eq('id', id)
      .single();

    if (reflectionResult.error || !reflectionResult.data) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
    }

    const reflectionData = reflectionResult.data;

    // 3. Verify user owns this reflection
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || reflectionData.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Transform to frontend format
    const formattedReflection: Reflection = {
      id: reflectionData.id,
      userId: reflectionData.user_id,
      title: reflectionData.title,
      content: reflectionData.content,
      reflectionType: reflectionData.reflection_type as ReflectionType,
      reflectionDate: new Date(reflectionData.reflection_date),
      moodScore: reflectionData.mood_score,
      energyLevel: reflectionData.energy_level,
      tags: reflectionData.tags || [],
      relatedGoalIds: reflectionData.related_goal_ids || [],
      relatedNoteIds: reflectionData.related_note_ids || [],
      createdAt: new Date(reflectionData.created_at),
      updatedAt: new Date(reflectionData.updated_at),
    };

    return NextResponse.json({ reflection: formattedReflection });
  } catch (error: any) {
    console.error('Error in GET /api/reflections/:id:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reflection', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reflections/:id
 * Updates a reflection with conditional embedding regeneration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Fetch existing reflection
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('reflections')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
    }

    const reflectionData = fetchResult.data;

    // 4. Verify user owns this reflection
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || reflectionData.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Determine if embedding needs regeneration
    const needsNewEmbedding = embeddingService.needsEmbeddingRegeneration('reflection', body);

    // 6. Build update object
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.reflectionType !== undefined) updateData.reflection_type = body.reflectionType;
    if (body.reflectionDate !== undefined) updateData.reflection_date = body.reflectionDate;
    if (body.moodScore !== undefined) updateData.mood_score = body.moodScore;
    if (body.energyLevel !== undefined) updateData.energy_level = body.energyLevel;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.relatedGoalIds !== undefined) updateData.related_goal_ids = body.relatedGoalIds;
    if (body.relatedNoteIds !== undefined) updateData.related_note_ids = body.relatedNoteIds;

    // 7. Regenerate embedding if needed
    if (needsNewEmbedding) {
      const updatedReflection = {
        title: body.title !== undefined ? body.title : reflectionData.title,
        content: body.content !== undefined ? body.content : reflectionData.content,
        reflectionType: body.reflectionType !== undefined ? body.reflectionType : reflectionData.reflection_type,
        moodScore: body.moodScore !== undefined ? body.moodScore : reflectionData.mood_score,
        energyLevel: body.energyLevel !== undefined ? body.energyLevel : reflectionData.energy_level,
        tags: body.tags !== undefined ? body.tags : reflectionData.tags,
      };

      const embedding = await embeddingService.generateReflectionEmbedding(updatedReflection);
      updateData.embedding = embedding;
    }

    // 8. Update reflection in database
    const updateResult: any = await (supabase as any)
      .from('reflections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    const { data: reflection, error: updateError } = updateResult;

    if (updateError) {
      console.error('Error updating reflection:', updateError);
      throw updateError;
    }

    // 9. Transform to frontend format
    const formattedReflection: Reflection = {
      id: reflection.id,
      userId: reflection.user_id,
      title: reflection.title,
      content: reflection.content,
      reflectionType: reflection.reflection_type as ReflectionType,
      reflectionDate: new Date(reflection.reflection_date),
      moodScore: reflection.mood_score,
      energyLevel: reflection.energy_level,
      tags: reflection.tags || [],
      relatedGoalIds: reflection.related_goal_ids || [],
      relatedNoteIds: reflection.related_note_ids || [],
      createdAt: new Date(reflection.created_at),
      updatedAt: new Date(reflection.updated_at),
    };

    return NextResponse.json({ reflection: formattedReflection });
  } catch (error: any) {
    console.error('Error in PATCH /api/reflections/:id:', error);
    return NextResponse.json(
      { error: 'Failed to update reflection', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reflections/:id
 * Deletes a reflection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Verify reflection exists and user owns it
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('reflections')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
    }

    const existingReflection = fetchResult.data;

    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || existingReflection.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Delete reflection
    const { error: deleteError } = await supabase
      .from('reflections')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting reflection:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/reflections/:id:', error);
    return NextResponse.json(
      { error: 'Failed to delete reflection', details: error.message },
      { status: 500 }
    );
  }
}
