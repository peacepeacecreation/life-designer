import StatsCharts from '@/components/StatsCharts';
import Link from 'next/link';

export default function StatsPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">📊 Статистика</h1>
            <p className="text-muted-foreground">
              Відстежуйте свій прогрес та досягнення
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
          >
            ← Назад
          </Link>
        </div>

        <StatsCharts />
      </div>
    </main>
  );
}
