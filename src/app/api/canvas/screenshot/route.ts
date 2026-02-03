import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { put } from '@vercel/blob'
import { getServerClient } from '@/lib/supabase/pool'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/canvas/screenshot
 * Upload canvas screenshot to Vercel Blob Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const canvasId = formData.get('canvasId') as string

    if (!file || !canvasId) {
      return NextResponse.json({ error: 'File and canvasId are required' }, { status: 400 })
    }

    // Upload to Vercel Blob Storage
    // addRandomSuffix: false ensures the same filename is used and old screenshot is replaced
    const filename = `canvas-screenshots/canvas-${canvasId}.png`
    const blob = await put(filename, file, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false, // Replace existing screenshot instead of creating new one
    })

    const publicUrl = blob.url

    // Update canvas metadata with screenshot URL
    const supabase = getServerClient()
    if (supabase) {
      const { error: updateError } = await supabase
        .from('canvas_workspaces')
        // @ts-expect-error - Supabase types issue
        .update({ screenshot_url: publicUrl } as any)
        .eq('id', canvasId)

      if (updateError) {
        console.error('Error updating canvas metadata:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error) {
    console.error('Screenshot upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
