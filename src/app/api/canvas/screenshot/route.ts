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
    console.log('FormData entries:', Array.from(formData.entries()).length)

    const file = formData.get('file') as File
    const canvasId = formData.get('canvasId') as string

    console.log('File:', file ? `${file.name} (${file.size} bytes)` : 'null')
    console.log('Canvas ID:', canvasId)

    if (!file || !canvasId) {
      console.error('Missing file or canvasId:', { file: !!file, canvasId })
      return NextResponse.json({ error: 'File and canvasId are required' }, { status: 400 })
    }

    // Upload to Vercel Blob Storage
    // addRandomSuffix: false ensures the same filename is used and old screenshot is replaced
    const filename = `canvas-screenshots/canvas-${canvasId}.png`
    console.log('Uploading to Vercel Blob:', filename)

    const blob = await put(filename, file, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false, // Use same filename
      allowOverwrite: true, // Replace existing screenshot instead of creating new one
    })

    console.log('Upload successful:', blob.url)
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
  } catch (error: any) {
    console.error('Screenshot upload error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
    })
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
