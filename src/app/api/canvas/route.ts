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

    // Отримати всі canvas користувача
    const { data: canvases, error } = await supabase
      .from('canvas_workspaces')
      .select('id, title, created_at, updated_at, last_modified_at')
      .eq('user_id', (userData as any).id)
      .order('last_modified_at', { ascending: false })

    if (error) {
      console.error('Error fetching canvases:', error)
      return NextResponse.json({ error: 'Failed to fetch canvases' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      canvases: canvases || [],
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
