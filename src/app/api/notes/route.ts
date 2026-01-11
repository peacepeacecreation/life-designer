/**
 * Notes API - List and Create Operations
 *
 * GET /api/notes - Get all notes for authenticated user
 * POST /api/notes - Create new note with automatic embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Note, NoteType } from '@/types/notes';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/notes
 * Returns all notes for the authenticated user
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

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.data;

    // 3. Fetch all notes for user
    const notesResult: any = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    const { data: notes, error } = notesResult;

    if (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }

    // 4. Transform to frontend format
    const formattedNotes: Note[] = (notes || []).map((note: any) => ({
      id: note.id,
      userId: note.user_id,
      title: note.title,
      content: note.content,
      category: note.category,
      noteType: note.note_type as NoteType,
      tags: note.tags || [],
      relatedGoalIds: note.related_goal_ids || [],
      isPinned: note.is_pinned,
      isArchived: note.is_archived,
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error: any) {
    console.error('Error in GET /api/notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Creates a new note with automatic embedding generation
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
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
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

    // 4. Generate embedding for note
    const embedding = await embeddingService.generateNoteEmbedding({
      title: body.title,
      content: body.content,
      category: body.category,
      noteType: body.noteType,
      tags: body.tags || [],
    });

    // 5. Insert note with embedding
    const insertResult: any = await (supabase as any)
      .from('notes')
      .insert({
        user_id: userId,
        title: body.title,
        content: body.content,
        category: body.category || null,
        note_type: body.noteType || NoteType.GENERAL,
        tags: body.tags || [],
        related_goal_ids: body.relatedGoalIds || [],
        is_pinned: body.isPinned || false,
        is_archived: body.isArchived || false,
        embedding,
      })
      .select()
      .single();

    const { data: note, error: insertError } = insertResult;

    if (insertError) {
      console.error('Error inserting note:', insertError);
      throw insertError;
    }

    // 6. Transform to frontend format
    const formattedNote: Note = {
      id: note.id,
      userId: note.user_id,
      title: note.title,
      content: note.content,
      category: note.category,
      noteType: note.note_type as NoteType,
      tags: note.tags || [],
      relatedGoalIds: note.related_goal_ids || [],
      isPinned: note.is_pinned,
      isArchived: note.is_archived,
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
    };

    return NextResponse.json({ note: formattedNote }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/notes:', error);
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    );
  }
}
