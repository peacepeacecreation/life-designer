import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Canvas | Life Designer',
  description: 'План та дизайн вашого життя',
  openGraph: {
    title: 'Canvas | Life Designer',
    description: 'План та дизайн вашого життя',
    siteName: 'Life Designer',
    images: [
      {
        url: '/api/og/canvas',
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
    images: ['/api/og/canvas'],
  },
}

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return children
}
