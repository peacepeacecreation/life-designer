import { Metadata } from 'next'
import { generateCanvasMetadata } from './metadata'
import CanvasClient from '@/components/canvas/CanvasClient'

type Props = {
  searchParams: Promise<{ id?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return generateCanvasMetadata({ searchParams })
}

export default function CanvasPage() {
  return <CanvasClient />
}
