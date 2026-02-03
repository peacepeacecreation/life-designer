'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Loader2, Shield, ArrowRight, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserStats {
  goals: number;
  activeGoals: number;
  completedGoals: number;
  notes: number;
  reflections: number;
  events: number;
}

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  stats: UserStats;
}

interface UsersResponse {
  users: User[];
  total: number;
}

interface PlatformStats {
  totals: {
    users: number;
    goals: number;
    activeGoals: number;
    completedGoals: number;
    notes: number;
    reflections: number;
    events: number;
    canvases: number;
    timeEntries: number;
    totalTimeTrackedHours: number;
  };
  averages: {
    goalsPerUser: string;
    notesPerUser: string;
    eventsPerUser: string;
    hoursPerUser: string;
  };
  trends: {
    goals: { current: number; previous: number; change: number };
    notes: { current: number; previous: number; change: number };
    reflections: { current: number; previous: number; change: number };
    events: { current: number; previous: number; change: number };
  };
  topUsers: Array<{ userId: string; email: string; count: number }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    // Fetch users only when authenticated
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both users and stats in parallel
      const [usersResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);

      if (usersResponse.status === 403 || statsResponse.status === 403) {
        setError('У вас немає доступу до адмін панелі');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Не вдалося завантажити дані');
      }

      const usersData: UsersResponse = await usersResponse.json();
      const statsData: PlatformStats = await statsResponse.json();

      setUsers(usersData.users);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Помилка</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Повернутися на головну
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-4xl font-bold">Адмін Панель</h1>
            </div>
            <p className="text-muted-foreground">
              Керування користувачами та аналітика системи
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              На головну
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Користувачі
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Аналітика
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview - Users Table */}
          <TabsContent value="overview" className="space-y-6">
            {/* Simple Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Користувачів</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.users}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Цілей</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.goals}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.totals.activeGoals} активних
                    </p>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Нотаток</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.notes}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Роздумів</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.reflections}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Подій</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.events}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Годин відстежено</CardDescription>
                    <CardTitle className="text-2xl">{stats.totals.totalTimeTrackedHours}h</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Users Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>Користувачі</CardTitle>
                </div>
                <CardDescription>
                  Список всіх зареєстрованих користувачів та їх статистика
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Дата реєстрації</TableHead>
                        <TableHead className="text-center">Цілі</TableHead>
                        <TableHead className="text-center">Активні</TableHead>
                        <TableHead className="text-center">Завершені</TableHead>
                        <TableHead className="text-center">Нотатки</TableHead>
                        <TableHead className="text-center">Роздуми</TableHead>
                        <TableHead className="text-center">Події</TableHead>
                        <TableHead className="text-right">Дії</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Користувачів не знайдено
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{user.stats.goals}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default">{user.stats.activeGoals}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{user.stats.completedGoals}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{user.stats.notes}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{user.stats.reflections}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{user.stats.events}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/admin/users/${user.id}`}>
                                <Button variant="ghost" size="sm">
                                  Деталі
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Analytics - Detailed Stats */}
          <TabsContent value="analytics" className="space-y-6">
            {stats && (
              <>
                {/* Averages and Trends */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Середні показники на користувача</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Цілей</p>
                          <p className="text-2xl font-bold">{stats.averages.goalsPerUser}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Нотаток</p>
                          <p className="text-2xl font-bold">{stats.averages.notesPerUser}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Подій</p>
                          <p className="text-2xl font-bold">{stats.averages.eventsPerUser}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Годин</p>
                          <p className="text-2xl font-bold">{stats.averages.hoursPerUser}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Тренди (останні 7 днів)</CardTitle>
                      <CardDescription>Порівняння з попереднім тижнем</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(stats.trends).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{key}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">{value.current}</span>
                              <Badge
                                variant={value.change >= 0 ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {value.change >= 0 ? '+' : ''}{value.change}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Users */}
                {stats.topUsers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Топ активних користувачів</CardTitle>
                      <CardDescription>За кількістю створеного контенту</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.topUsers.slice(0, 5).map((user, index) => (
                          <div
                            key={user.userId}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-sm">
                                #{index + 1}
                              </Badge>
                              <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            <Badge variant="default">{user.count} записів</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
