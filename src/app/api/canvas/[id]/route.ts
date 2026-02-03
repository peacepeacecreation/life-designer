import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getServerClient } from '@/lib/supabase/pool'

/**
 * GET /api/canvas/[id]
 * Отримати метадані конкретного canvas
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+)
    const { id } = await params

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

    // Отримати canvas (власний або shared)
    const { data: canvas, error } = await supabase
      .from('canvas_workspaces')
      .select('id, title, nodes, edges, created_at, updated_at, last_modified_at, user_id')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching canvas:', error)
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    // Check access (owner or shared)
    const isOwner = (canvas as any).user_id === (userData as any).id
    let permission: string = 'edit'

    if (!isOwner) {
      const { data: share } = await supabase
        .from('canvas_shares')
        .select('permission_level')
        .eq('canvas_id', id)
        .eq('shared_with_email', session.user.email)
        .maybeSingle()

      if (!share) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      permission = (share as any).permission_level
    }

    return NextResponse.json({
      success: true,
      canvas: {
        ...canvas,
        permission,
        is_owner: isOwner,
      },
    })
  } catch (error) {
    console.error('Canvas GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/canvas/[id]
 * Оновити метадані canvas (назва)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+)
    const { id } = await params

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
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Оновити canvas
    const { data: updatedCanvas, error } = await supabase
      .from('canvas_workspaces')
      // @ts-expect-error - Supabase types issue
      .update({ title } as any)
      .eq('id', id)
      .eq('user_id', (userData as any).id)
      .select('id, title, updated_at')
      .single()

    if (error) {
      console.error('Error updating canvas:', error)
      return NextResponse.json({ error: 'Failed to update canvas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      canvas: updatedCanvas,
    })
  } catch (error) {
    console.error('Canvas PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canvas/[id]
 * Видалити canvas
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+)
    const { id } = await params

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

    // Видалити canvas
    const { error } = await supabase
      .from('canvas_workspaces')
      .delete()
      .eq('id', id)
      .eq('user_id', (userData as any).id)

    if (error) {
      console.error('Error deleting canvas:', error)
      return NextResponse.json({ error: 'Failed to delete canvas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Canvas deleted successfully',
    })
  } catch (error) {
    console.error('Canvas DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
