import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getServerClient } from '@/lib/supabase/pool'

/**
 * GET /api/canvas/notes?canvas_id=xxx&node_id=xxx&prompt_id=xxx
 * Get a note for a specific prompt
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single() as { data: { id: string } | null; error: any }

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const canvas_id = searchParams.get('canvas_id')
    const node_id = searchParams.get('node_id')
    const prompt_id = searchParams.get('prompt_id')

    if (!canvas_id || !node_id || !prompt_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: canvas_id, node_id, prompt_id' },
        { status: 400 }
      )
    }

    // @ts-ignore - prompt_notes table exists but not in generated types yet
    const { data, error } = await supabase
      .from('prompt_notes')
      .select('*')
      .eq('canvas_id', canvas_id)
      .eq('node_id', node_id)
      .eq('prompt_id', prompt_id)
      .eq('user_id', userData.id)
      .single()

    if (error) {
      // Note doesn't exist yet - this is OK
      if (error.code === 'PGRST116') {
        return NextResponse.json({ note: null })
      }
      console.error('Error fetching note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note: data })
  } catch (error) {
    console.error('Error in GET /api/canvas/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/canvas/notes
 * Create or update a note
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single() as { data: { id: string } | null; error: any }

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { canvas_id, node_id, prompt_id, content } = body

    if (!canvas_id || !node_id || !prompt_id) {
      return NextResponse.json(
        { error: 'Missing required fields: canvas_id, node_id, prompt_id' },
        { status: 400 }
      )
    }

    // Upsert: insert or update if exists
    // @ts-ignore - prompt_notes table exists but not in generated types yet
    const { data, error } = await supabase
      .from('prompt_notes')
      // @ts-ignore
      .upsert({
        canvas_id,
        node_id,
        prompt_id,
        content: content || [],
        user_id: userData.id,
      }, {
        onConflict: 'canvas_id,node_id,prompt_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note: data })
  } catch (error) {
    console.error('Error in POST /api/canvas/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/canvas/notes?canvas_id=xxx&node_id=xxx&prompt_id=xxx
 * Delete a note
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single() as { data: { id: string } | null; error: any }

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const canvas_id = searchParams.get('canvas_id')
    const node_id = searchParams.get('node_id')
    const prompt_id = searchParams.get('prompt_id')

    if (!canvas_id || !node_id || !prompt_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: canvas_id, node_id, prompt_id' },
        { status: 400 }
      )
    }

    // @ts-ignore - prompt_notes table exists but not in generated types yet
    const { error } = await supabase
      .from('prompt_notes')
      .delete()
      .eq('canvas_id', canvas_id)
      .eq('node_id', node_id)
      .eq('prompt_id', prompt_id)
      .eq('user_id', userData.id)

    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/canvas/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
