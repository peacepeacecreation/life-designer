'use client';

import dynamic from 'next/dynamic';
import { LoadingPage } from '@/components/ui/loader';

// Load entire calendar page dynamically to avoid Turbopack + react-big-calendar compilation issues
const CalendarPageWrapper = dynamic(() => import('@/components/CalendarPageWrapper'), {
  ssr: false,
  loading: () => <LoadingPage message="Завантаження календаря..." />
});

export default function CalendarPage() {
  return <CalendarPageWrapper />;
}
