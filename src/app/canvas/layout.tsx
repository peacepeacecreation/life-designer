import { Metadata } from 'next'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  searchParams: Promise<{ id?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://life-designer.pp.ua'
  const params = await searchParams
  const canvasId = params.id

  // Build OG image URL with canvas ID if available
  const ogImageUrl = canvasId
    ? `${baseUrl}/api/og/canvas?id=${canvasId}`
    : `${baseUrl}/api/og/canvas`

  return {
    title: 'Canvas | Life Designer',
    description: 'План та дизайн вашого життя',
    openGraph: {
      title: 'Canvas | Life Designer',
      description: 'План та дизайн вашого життя',
      url: canvasId ? `${baseUrl}/canvas?id=${canvasId}` : `${baseUrl}/canvas`,
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
      title: 'Canvas | Life Designer',
      description: 'План та дизайн вашого життя',
      images: [ogImageUrl],
    },
  }
}

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return children
}
