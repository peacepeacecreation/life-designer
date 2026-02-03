import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/canvas/screenshot
 * Upload canvas screenshot to Supabase Storage
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

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const filename = `canvas-${canvasId}.png`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('canvas-screenshots')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('canvas-screenshots')
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    // Update canvas metadata with screenshot URL
    const { error: updateError } = await supabase
      .from('canvas_workspaces')
      .update({ screenshot_url: publicUrl } as any)
      .eq('id', canvasId)

    if (updateError) {
      console.error('Error updating canvas metadata:', updateError)
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
