import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { getServerClient } from '@/lib/supabase/pool'

/**
 * GET /api/canvas/[id]/share
 * Get list of users with access to this canvas
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user owns this canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_workspaces')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', (userData as any).id)
      .single()

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found or access denied' }, { status: 404 })
    }

    // Get shares
    const { data: shares, error: sharesError } = await supabase
      .from('canvas_shares')
      .select('id, shared_with_email, permission_level, created_at')
      .eq('canvas_id', id)
      .order('created_at', { ascending: false })

    if (sharesError) {
      console.error('Error fetching shares:', sharesError)
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      shares: shares || [],
    })
  } catch (error) {
    console.error('Canvas share GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/canvas/[id]/share
 * Share canvas with a user
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { email, permission } = body

    if (!email || !permission) {
      return NextResponse.json({ error: 'Email and permission are required' }, { status: 400 })
    }

    if (!['view', 'edit'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
    }

    // Check if user owns this canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_workspaces')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', (userData as any).id)
      .single()

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found or access denied' }, { status: 404 })
    }

    // Cannot share with yourself
    if (email.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
    }

    // Create or update share
    const { data: share, error: shareError } = await supabase
      .from('canvas_shares')
      .upsert({
        canvas_id: id,
        shared_with_email: email.toLowerCase(),
        shared_by_user_id: (userData as any).id,
        permission_level: permission,
      } as any, {
        onConflict: 'canvas_id,shared_with_email',
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error creating share:', shareError)
      return NextResponse.json({ error: 'Failed to share canvas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      share,
    })
  } catch (error) {
    console.error('Canvas share POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canvas/[id]/share
 * Remove user's access to canvas
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user owns this canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_workspaces')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', (userData as any).id)
      .single()

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found or access denied' }, { status: 404 })
    }

    // Delete share
    const { error: deleteError } = await supabase
      .from('canvas_shares')
      .delete()
      .eq('canvas_id', id)
      .eq('shared_with_email', email.toLowerCase())

    if (deleteError) {
      console.error('Error deleting share:', deleteError)
      return NextResponse.json({ error: 'Failed to remove access' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Access removed successfully',
    })
  } catch (error) {
    console.error('Canvas share DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
