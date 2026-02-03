import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase/pool'

export const runtime = 'edge'

/**
 * GET /api/og/canvas?id={canvasId}
 * Returns OG image for canvas - either screenshot or generated image with title
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const canvasId = searchParams.get('id')

    if (!canvasId) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              color: 'white',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            Life Designer Canvas
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Get canvas metadata from database
    const supabase = getServerClient()
    if (!supabase) {
      throw new Error('Database unavailable')
    }

    const { data: canvas } = await supabase
      .from('canvas_workspaces')
      .select('title, screenshot_url')
      .eq('id', canvasId)
      .maybeSingle()

    // If canvas has screenshot URL, redirect to it
    if (canvas && (canvas as any).screenshot_url) {
      return Response.redirect((canvas as any).screenshot_url)
    }

    // Generate OG image with canvas title
    const title = canvas ? (canvas as any).title : 'Canvas'

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '60px 80px',
              borderRadius: '24px',
              border: '2px solid #334155',
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: 'white',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              Life Designer Canvas
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG image generation error:', error)

    // Fallback OG image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: 'white',
            fontSize: 48,
            fontWeight: 'bold',
          }}
        >
          Life Designer Canvas
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
