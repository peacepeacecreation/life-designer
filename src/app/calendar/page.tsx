'use client';

import dynamic from 'next/dynamic';

// Load entire calendar page dynamically to avoid Turbopack + react-big-calendar compilation issues
const CalendarPageWrapper = dynamic(() => import('@/components/CalendarPageWrapper'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Завантаження календаря...</p>
      </div>
    </main>
  )
});

export default function CalendarPage() {
  return <CalendarPageWrapper />;
}
