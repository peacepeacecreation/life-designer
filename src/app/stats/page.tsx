import StatsCharts from '@/components/StatsCharts';
import Link from 'next/link';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StatsPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
              <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1 text-black dark:text-white">Статистика</h1>
              <p className="text-muted-foreground">
                Відстежуйте свій прогрес та досягнення
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </Link>
        </div>

        <StatsCharts />
      </div>
    </main>
  );
}
