'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Mail, Calendar as CalendarIcon, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserActivityDetails from '@/components/admin/UserActivityDetails';

interface User {
  id: string;
  email: string;
  created_at: string;
}

export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    // Fetch user data when authenticated
    if (status === 'authenticated') {
      fetchUser();
    }
  }, [status, router, userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user basic info from activity endpoint (it includes user data)
      const response = await fetch(`/api/admin/users/${userId}/activity`);

      if (response.status === 403) {
        setError('У вас немає доступу до адмін панелі');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      if (response.status === 404) {
        setError('Користувача не знайдено');
        return;
      }

      if (!response.ok) {
        throw new Error('Не вдалося завантажити дані користувача');
      }

      const data = await response.json();
      setUser(data.user);
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
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Повернутися до списку
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад до списку
              </Button>
            </Link>
            <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Деталі користувача</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Повна інформація про активність та використання платформи
              </p>
            </div>
          </div>

          {/* User Info Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-xl">{user.email}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Зареєстрований: {formatDate(user.created_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1">
                    {user.id}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Activity Details */}
        <UserActivityDetails userId={userId} />
      </div>
    </main>
  );
}
