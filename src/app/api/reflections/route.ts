/**
 * Reflections API - List and Create Operations
 *
 * GET /api/reflections - Get all reflections for authenticated user
 * POST /api/reflections - Create new reflection with automatic embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Reflection, ReflectionType } from '@/types/reflections';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/reflections
 * Returns all reflections for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerClient();

    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Service unavailable',
          details: 'Database not configured. Please add Supabase environment variables to .env.local'
        },
        { status: 503 }
      );
    }

    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    // If user doesn't exist yet, return empty array (new user case)
    if (userResult.error || !userResult.data) {
      return NextResponse.json({ reflections: [] });
    }

    const userData = userResult.data;

    // 3. Fetch all reflections for user
    const reflectionsResult: any = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userData.id)
      .order('reflection_date', { ascending: false });

    const { data: reflections, error } = reflectionsResult;

    if (error) {
      console.error('Error fetching reflections:', error);
      throw error;
    }

    // 4. Transform to frontend format
    const formattedReflections: Reflection[] = (reflections || []).map((reflection: any) => ({
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
    }));

    return NextResponse.json({ reflections: formattedReflections });
  } catch (error: any) {
    console.error('Error in GET /api/reflections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reflections', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reflections
 * Creates a new reflection with automatic embedding generation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerClient();

    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Service unavailable',
          details: 'Database not configured. Please add Supabase environment variables to .env.local'
        },
        { status: 503 }
      );
    }

    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.content || !body.reflectionDate) {
      return NextResponse.json(
        { error: 'Title, content, and reflection date are required' },
        { status: 400 }
      );
    }

    // 3. Get or create user
    let userId: string;
    const existingUserResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (existingUserResult.data) {
      userId = existingUserResult.data.id;
    } else {
      const newUserResult: any = await (supabase as any)
        .from('users')
        .insert({ email: session.user.email })
        .select('id')
        .single();

      if (newUserResult.error || !newUserResult.data) {
        throw new Error('Failed to create user');
      }
      userId = newUserResult.data.id;
    }

    // 4. Generate embedding for reflection
    const embedding = await embeddingService.generateReflectionEmbedding({
      title: body.title,
      content: body.content,
      reflectionType: body.reflectionType,
      moodScore: body.moodScore,
      energyLevel: body.energyLevel,
      tags: body.tags || [],
    });

    // 5. Insert reflection with embedding
    const insertResult: any = await (supabase as any)
      .from('reflections')
      .insert({
        user_id: userId,
        title: body.title,
        content: body.content,
        reflection_type: body.reflectionType || ReflectionType.DAILY,
        reflection_date: body.reflectionDate,
        mood_score: body.moodScore || null,
        energy_level: body.energyLevel || null,
        tags: body.tags || [],
        related_goal_ids: body.relatedGoalIds || [],
        related_note_ids: body.relatedNoteIds || [],
        embedding,
      })
      .select()
      .single();

    const { data: reflection, error: insertError } = insertResult;

    if (insertError) {
      console.error('Error inserting reflection:', insertError);
      throw insertError;
    }

    // 6. Transform to frontend format
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

    return NextResponse.json({ reflection: formattedReflection }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/reflections:', error);
    return NextResponse.json(
      { error: 'Failed to create reflection', details: error.message },
      { status: 500 }
    );
  }
}
