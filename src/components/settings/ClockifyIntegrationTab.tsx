'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import ClockifyProjectMappingTable from './ClockifyProjectMappingTable';

interface ClockifyWorkspace {
  id: string;
  name: string;
}

interface ClockifyConnection {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  clockifyUserId: string;
  clockifyUserEmail: string;
  syncStatus: 'pending' | 'syncing' | 'success' | 'error';
  lastSyncAt?: string;
  isActive: boolean;
}

export default function ClockifyIntegrationTab() {
  // Connection state
  const [connection, setConnection] = useState<ClockifyConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  // Connect form state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [workspaces, setWorkspaces] = useState<ClockifyWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Error/success messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing connection on mount
  useEffect(() => {
    fetchConnection();
  }, []);

  const fetchConnection = async () => {
    try {
      setLoadingConnection(true);
      const response = await fetch('/api/integrations/clockify/connection');

      if (response.ok) {
        const data = await response.json();
        setConnection(data.connection);
      } else if (response.status !== 404) {
        console.error('Failed to fetch connection');
      }
    } catch (err) {
      console.error('Error fetching connection:', err);
    } finally {
      setLoadingConnection(false);
    }
  };

  // Fetch workspaces when API key is entered
  const handleFetchWorkspaces = async () => {
    if (!apiKey || apiKey.length < 10) {
      setError('Будь ласка, введіть валідний API ключ');
      return;
    }

    try {
      setLoadingWorkspaces(true);
      setError(null);

      // Validate API key by fetching workspaces
      const testClient = await fetch('/api/integrations/clockify/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!testClient.ok) {
        const errorData = await testClient.json();
        throw new Error(errorData.error || 'Невалідний API ключ');
      }

      const data = await testClient.json();
      setWorkspaces(data.workspaces || []);

      if (data.workspaces.length === 0) {
        setError('Не знайдено жодного workspace');
      } else {
        setSuccess('Workspaces завантажено успішно');
      }
    } catch (err: any) {
      setError(err.message || 'Помилка завантаження workspaces');
      setWorkspaces([]);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  // Connect to Clockify
  const handleConnect = async () => {
    if (!selectedWorkspace) {
      setError('Будь ласка, виберіть workspace');
      return;
    }

    try {
      setConnecting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/integrations/clockify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          workspaceId: selectedWorkspace,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка підключення');
      }

      const data = await response.json();
      setConnection(data.connection);
      setSuccess('Підключення успішне! Почалася синхронізація...');

      // Clear form
      setApiKey('');
      setWorkspaces([]);
      setSelectedWorkspace('');
    } catch (err: any) {
      setError(err.message || 'Помилка підключення до Clockify');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect from Clockify
  const handleDisconnect = async () => {
    if (!connection) return;

    if (!confirm('Ви впевнені, що хочете відключити Clockify? Дані не будуть видалені.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const response = await fetch('/api/integrations/clockify/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка відключення');
      }

      setConnection(null);
      setSuccess('Clockify відключено успішно');
    } catch (err: any) {
      setError(err.message || 'Помилка відключення');
    } finally {
      setDisconnecting(false);
    }
  };

  // Trigger manual sync
  const handleSync = async () => {
    if (!connection) return;

    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/integrations/clockify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          syncType: 'incremental',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка синхронізації');
      }

      const data = await response.json();
      setSuccess(
        `Синхронізація завершена: ${data.stats.imported} імпортовано, ${data.stats.updated} оновлено`
      );

      // Refresh connection to get updated sync time
      await fetchConnection();
    } catch (err: any) {
      setError(err.message || 'Помилка синхронізації');
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (!connection) return null;

    switch (connection.syncStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'syncing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loadingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      {connection ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6" />
                <div>
                  <CardTitle>Clockify підключено</CardTitle>
                  <CardDescription>
                    Workspace: {connection.workspaceName || connection.workspaceId}
                  </CardDescription>
                </div>
              </div>
              {getSyncStatusIcon()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">User Email:</p>
                <p className="font-medium">{connection.clockifyUserEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Остання синхронізація:</p>
                <p className="font-medium">
                  {connection.lastSyncAt
                    ? new Date(connection.lastSyncAt).toLocaleString('uk-UA')
                    : 'Ніколи'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing || connection.syncStatus === 'syncing'}
                className="flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Синхронізація...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Синхронізувати зараз
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open('https://app.clockify.me', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Відкрити Clockify
              </Button>

              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 ml-auto"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Відключення...
                  </>
                ) : (
                  <>
                    <Unlink className="h-4 w-4" />
                    Відключити
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Connect Form */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6" />
              <div>
                <CardTitle>Підключити Clockify</CardTitle>
                <CardDescription>
                  Синхронізуйте ваші time entries з Clockify для автоматичного відстеження часу
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Clockify API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Введіть ваш Clockify API ключ"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={loadingWorkspaces}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loadingWorkspaces}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={handleFetchWorkspaces}
                  disabled={!apiKey || loadingWorkspaces}
                >
                  {loadingWorkspaces ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Завантажити'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Отримайте API ключ:{' '}
                <a
                  href="https://app.clockify.me/user/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Clockify Settings → API
                </a>
              </p>
            </div>

            {workspaces.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger id="workspace">
                    <SelectValue placeholder="Виберіть workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {workspaces.length > 0 && (
              <Button
                onClick={handleConnect}
                disabled={!selectedWorkspace || connecting}
                className="w-full flex items-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Підключення...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Підключити Clockify
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Mappings */}
      {connection && (
        <>
          <Separator />
          <ClockifyProjectMappingTable connectionId={connection.id} />
        </>
      )}
    </div>
  );
}
