import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Target, Activity, BarChart3, FileText, Lightbulb } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Life Designer
          </h1>
          <p className="text-xl text-muted-foreground">
            Плануйте своє життя з метою та наміром
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/calendar">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl text-black dark:text-white">Календар</CardTitle>
                </div>
                <CardDescription className="text-base text-black/70 dark:text-white/70">
                  Плануйте події та розклад
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/goals">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                    <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl text-black dark:text-white">Цілі</CardTitle>
                </div>
                <CardDescription className="text-base text-black/70 dark:text-white/70">
                  Керуйте своїми життєвими цілями та пріоритетами
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/notes">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl text-black dark:text-white">Нотатки</CardTitle>
                </div>
                <CardDescription className="text-base text-black/70 dark:text-white/70">
                  Зберігайте ідеї, нотатки зі зустрічей та навчальні матеріали
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reflections">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
                    <Lightbulb className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <CardTitle className="text-2xl text-black dark:text-white">Роздуми</CardTitle>
                </div>
                <CardDescription className="text-base text-black/70 dark:text-white/70">
                  Щоденні, тижневі та місячні рефлексії для самоаналізу
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-all h-full bg-white dark:bg-card opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-pink-100 dark:bg-pink-950 rounded-lg">
                  <Activity className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle className="text-2xl text-black dark:text-white">Звички</CardTitle>
              </div>
              <CardDescription className="text-base text-black/70 dark:text-white/70">
                Формуйте позитивні щоденні звички (скоро)
              </CardDescription>
            </CardHeader>
          </Card>

          <Link href="/stats">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-white dark:bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-2xl text-black dark:text-white">Статистика</CardTitle>
                </div>
                <CardDescription className="text-base text-black/70 dark:text-white/70">
                  Відстежуйте свій прогрес та досягнення
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
