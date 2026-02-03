import { Metadata } from 'next'

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

  return {
    title: 'Canvas | Life Designer',
    description: 'План та дизайн вашого життя',
    openGraph: {
      title: 'Canvas | Life Designer',
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
      title: 'Canvas | Life Designer',
      description: 'План та дизайн вашого життя',
      images: [ogImageUrl],
    },
  }
}
