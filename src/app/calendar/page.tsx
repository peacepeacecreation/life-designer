import { Metadata } from 'next';
import CalendarComponent from '@/components/CalendarComponent';
import RecurringEventsPanel from '@/components/RecurringEventsPanel';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Apple, CalendarDays } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Календар | Life Designer',
  description: 'Плануйте ваше життя з календарем подій',
};

export default function CalendarPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Календар</h1>
          <p className="text-muted-foreground">
            Керуйте своїми подіями та планами. Натисніть на вільний час, щоб додати нову подію.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarComponent />
          </div>
          <div className="lg:col-span-1">
            <RecurringEventsPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
