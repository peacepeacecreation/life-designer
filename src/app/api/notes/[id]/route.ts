/**
 * Notes API - Individual Note Operations
 *
 * GET /api/notes/:id - Get single note
 * PATCH /api/notes/:id - Update note (with conditional embedding regeneration)
 * DELETE /api/notes/:id - Delete note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { embeddingService } from '@/lib/embeddings';
import { Note, NoteType } from '@/types/notes';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/notes/:id
 * Returns a single note by ID
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

    // 2. Fetch note
    // Type cast to bypass Supabase's complex type inference issues
    const noteResult: any = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (noteResult.error || !noteResult.data) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const noteData = noteResult.data;

    // 3. Verify user owns this note
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || noteData.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Transform to frontend format
    const formattedNote: Note = {
      id: noteData.id,
      userId: noteData.user_id,
      title: noteData.title,
      content: noteData.content,
      category: noteData.category,
      noteType: noteData.note_type as NoteType,
      tags: noteData.tags || [],
      relatedGoalIds: noteData.related_goal_ids || [],
      isPinned: noteData.is_pinned,
      isArchived: noteData.is_archived,
      createdAt: new Date(noteData.created_at),
      updatedAt: new Date(noteData.updated_at),
    };

    return NextResponse.json({ note: formattedNote });
  } catch (error: any) {
    console.error('Error in GET /api/notes/:id:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/:id
 * Updates a note with conditional embedding regeneration
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

    // 3. Fetch existing note
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const noteData = fetchResult.data;

    // 4. Verify user owns this note
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || noteData.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Determine if embedding needs regeneration
    const needsNewEmbedding = embeddingService.needsEmbeddingRegeneration('note', body);

    // 6. Build update object
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.noteType !== undefined) updateData.note_type = body.noteType;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.relatedGoalIds !== undefined) updateData.related_goal_ids = body.relatedGoalIds;
    if (body.isPinned !== undefined) updateData.is_pinned = body.isPinned;
    if (body.isArchived !== undefined) updateData.is_archived = body.isArchived;

    // 7. Regenerate embedding if needed
    if (needsNewEmbedding) {
      const updatedNote = {
        title: body.title !== undefined ? body.title : noteData.title,
        content: body.content !== undefined ? body.content : noteData.content,
        category: body.category !== undefined ? body.category : noteData.category,
        noteType: body.noteType !== undefined ? body.noteType : noteData.note_type,
        tags: body.tags !== undefined ? body.tags : noteData.tags,
      };

      const embedding = await embeddingService.generateNoteEmbedding(updatedNote);
      updateData.embedding = embedding;
    }

    // 8. Update note in database
    const updateResult: any = await (supabase as any)
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    const { data: note, error: updateError } = updateResult;

    if (updateError) {
      console.error('Error updating note:', updateError);
      throw updateError;
    }

    // 9. Transform to frontend format
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

    return NextResponse.json({ note: formattedNote });
  } catch (error: any) {
    console.error('Error in PATCH /api/notes/:id:', error);
    return NextResponse.json(
      { error: 'Failed to update note', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/:id
 * Deletes a note
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

    // 2. Verify note exists and user owns it
    // Type cast to bypass Supabase's complex type inference issues
    const fetchResult: any = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchResult.error || !fetchResult.data) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const existingNote = fetchResult.data;

    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userResult.data || existingNote.user_id !== userResult.data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Delete note
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in DELETE /api/notes/:id:', error);
    return NextResponse.json(
      { error: 'Failed to delete note', details: error.message },
      { status: 500 }
    );
  }
}
