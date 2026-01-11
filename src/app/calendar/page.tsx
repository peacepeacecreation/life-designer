import { Metadata } from 'next';
import CalendarComponent from '@/components/CalendarComponent';
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

        <div className="bg-white dark:bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <CalendarComponent />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Майбутня інтеграція</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <Apple className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <CardTitle className="text-lg">Apple Calendar</CardTitle>
                </div>
                <CardDescription>
                  Синхронізація з Apple Calendar через CalDAV API
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Google Calendar</CardTitle>
                </div>
                <CardDescription>
                  Інтеграція з Google Calendar API для автоматичної синхронізації
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
