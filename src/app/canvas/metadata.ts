import { Metadata } from 'next'
import { getServerClient } from '@/lib/supabase/pool'

type Props = {
  searchParams: Promise<{ id?: string }>
}

export async function generateCanvasMetadata({ searchParams }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://life-designer.pp.ua'
  const params = await searchParams
  const canvasId = params?.id

  const ogImageUrl = canvasId
    ? `${baseUrl}/api/og/canvas?id=${canvasId}`
    : `${baseUrl}/api/og/canvas`

  const url = canvasId ? `${baseUrl}/canvas?id=${canvasId}` : `${baseUrl}/canvas`

  // Fetch canvas title from database if canvasId exists
  let canvasTitle = 'Canvas'
  if (canvasId) {
    const supabase = getServerClient()
    if (supabase) {
      const { data } = await (supabase as any)
        .from('canvas_workspaces')
        .select('title')
        .eq('id', canvasId)
        .maybeSingle()

      if (data?.title) {
        canvasTitle = data.title
      }
    }
  }

  const fullTitle = `${canvasTitle} | Life Designer`

  return {
    title: fullTitle,
    description: 'План та дизайн вашого життя',
    openGraph: {
      title: canvasTitle,
      description: 'План та дизайн вашого життя',
      url,
      siteName: 'Life Designer',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Life Designer Canvas',
        },
      ],
      locale: 'uk_UA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: canvasTitle,
      description: 'План та дизайн вашого життя',
      images: [ogImageUrl],
    },
  }
}
