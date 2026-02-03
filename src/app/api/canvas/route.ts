import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getServerClient } from '@/lib/supabase/pool'

/**
 * GET /api/canvas
 * Отримати всі canvas користувача
 */
export async function GET() {
  try {
    // Перевірка авторизації
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client
    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Отримати власні canvas користувача
    const { data: ownCanvases, error: ownError } = await supabase
      .from('canvas_workspaces')
      .select('id, title, created_at, updated_at, last_modified_at, user_id')
      .eq('user_id', (userData as any).id)
      .order('last_modified_at', { ascending: false })

    if (ownError) {
      console.error('Error fetching own canvases:', ownError)
      return NextResponse.json({ error: 'Failed to fetch canvases' }, { status: 500 })
    }

    // Отримати shared canvas
    const { data: sharedCanvases, error: sharedError } = await supabase
      .from('canvas_shares')
      .select(`
        canvas_id,
        permission_level,
        canvas_workspaces!inner (
          id,
          title,
          created_at,
          updated_at,
          last_modified_at,
          user_id
        )
      `)
      .eq('shared_with_email', session.user.email)

    if (sharedError) {
      console.error('Error fetching shared canvases:', sharedError)
    }

    // Combine and format results
    const allCanvases = [
      ...(ownCanvases || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at,
        updated_at: c.updated_at,
        last_modified_at: c.last_modified_at,
        is_owner: true,
        permission: 'edit' as const,
      })),
      ...(sharedCanvases || []).map((s: any) => ({
        id: s.canvas_workspaces.id,
        title: s.canvas_workspaces.title,
        created_at: s.canvas_workspaces.created_at,
        updated_at: s.canvas_workspaces.updated_at,
        last_modified_at: s.canvas_workspaces.last_modified_at,
        is_owner: false,
        permission: s.permission_level,
      })),
    ].sort((a, b) => new Date(b.last_modified_at).getTime() - new Date(a.last_modified_at).getTime())

    return NextResponse.json({
      success: true,
      canvases: allCanvases,
    })
  } catch (error) {
    console.error('Canvas GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/canvas
 * Створити новий canvas
 */
export async function POST(request: Request) {
  try {
    // Перевірка авторизації
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client
    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Отримати дані з body
    const body = await request.json()
    const { title = 'Новий Canvas' } = body

    // Створити новий canvas
    const { data: newCanvas, error } = await supabase
      .from('canvas_workspaces')
      .insert({
        user_id: (userData as any).id,
        title,
        nodes: [],
        edges: [],
      } as any)
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating canvas:', error)
      return NextResponse.json({ error: 'Failed to create canvas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      canvas: newCanvas,
    })
  } catch (error) {
    console.error('Canvas POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
