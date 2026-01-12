'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Key, Copy, Plus, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UserSettingsTab() {
  const { data: session, status } = useSession();
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRegenerateEmbeddings = async () => {
    try {
      setRegenerating(true);
      setRegenerateResult(null);

      const response = await fetch('/api/goals/regenerate-embeddings', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setRegenerateResult({
          success: true,
          message: data.message + `. Оновлено: ${data.updated}, Помилок: ${data.failed}`,
        });
      } else {
        setRegenerateResult({
          success: false,
          message: data.error || 'Помилка регенерації',
        });
      }
    } catch (error) {
      setRegenerateResult({
        success: false,
        message: 'Помилка підключення до сервера',
      });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Аутентифікація */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'authenticated' ? (
              <LogOut className="h-5 w-5" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            Аутентифікація
          </CardTitle>
          <CardDescription>
            Підключіть ваш Google акаунт для синхронізації з календарем
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'authenticated' && session?.user ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium whitespace-nowrap">
                    Синхронізовано з Google Account
                  </span>
                </div>
              </div>
              <Button
                onClick={() => signOut()}
                variant="outline"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Вийти з акаунту
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Увійдіть для синхронізації подій з Google Calendar та доступу до всіх функцій платформи.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => signIn('google')}
                variant="default"
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Увійти через Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys (для майбутнього MCP) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Ключі
          </CardTitle>
          <CardDescription>
            Керуйте API ключами для інтеграцій та MCP серверів (в розробці)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Функціонал створення та керування API ключами буде додано в наступних версіях.
              Це дозволить підключатися до платформи через MCP протокол.
            </AlertDescription>
          </Alert>

          {/* Заглушка для майбутнього функціоналу */}
          <div className="mt-4 space-y-3 opacity-50 pointer-events-none">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">MCP Server Key</p>
                  <p className="text-xs text-muted-foreground">
                    sk_****_********************************
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Створити новий API ключ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Регенерація Embeddings */}
      {status === 'authenticated' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Оптимізація даних
            </CardTitle>
            <CardDescription>
              Оновіть семантичні індекси для покращення пошуку цілей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Якщо деякі цілі не відображаються в селектах або пошуку, спробуйте регенерувати embeddings.
                Це оновить семантичні індекси для всіх цілей.
              </AlertDescription>
            </Alert>

            {regenerateResult && (
              <Alert variant={regenerateResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  {regenerateResult.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleRegenerateEmbeddings}
              disabled={regenerating}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Оновлення...' : 'Регенерувати Embeddings'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
