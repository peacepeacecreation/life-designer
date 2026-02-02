'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { startOfWeek } from 'date-fns';

interface TimeEntry {
  id: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  goal_id: string | null;
  goal_name: string | null;
  clockify_project_name: string | null;
}

interface ClockifyConnection {
  id: string;
  workspaceId: string;
  isActive: boolean;
}

interface ClockifyContextType {
  isConnected: boolean;
  connection: ClockifyConnection | null;
  entries: TimeEntry[];
  loading: boolean;
  loadingEntries: boolean;
  error: string | null;
  refetchConnection: () => void;
  refetchEntries: () => void;
  startTimer: (goalId: string, description: string) => Promise<void>;
}

const ClockifyContext = createContext<ClockifyContextType | undefined>(undefined);

export function ClockifyProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<ClockifyConnection | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Clockify connection status
  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/integrations/clockify/connection');

      if (response.ok) {
        const data = await response.json();
        if (data.connection) {
          setIsConnected(true);
          setConnection({
            id: data.connection.id,
            workspaceId: data.connection.workspace_id,
            isActive: data.connection.is_active,
          });
        } else {
          setIsConnected(false);
          setConnection(null);
        }
      } else {
        setIsConnected(false);
        setConnection(null);
      }
    } catch (err) {
      console.error('Error fetching Clockify connection:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current week entries
  const fetchEntries = useCallback(async () => {
    if (!isConnected) return;

    try {
      setLoadingEntries(true);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      // Format as local date string to avoid timezone issues
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartStr = `${year}-${month}-${day}`;

      console.log('Fetching Clockify entries for week:', weekStartStr, '(', weekStart.toISOString(), ')');

      const response = await fetch(
        `/api/clockify/weekly-entries?weekStart=${weekStartStr}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Received entries:', data.entries?.length || 0, 'entries');
        setEntries(data.entries || []);
      } else {
        console.error('Failed to fetch entries:', response.status);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [isConnected]);

  // Load connection when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchConnection();
    } else if (status === 'unauthenticated') {
      setIsConnected(false);
      setConnection(null);
      setLoading(false);
    }
  }, [status, fetchConnection]);

  // Load entries when connected
  useEffect(() => {
    if (isConnected) {
      fetchEntries();
    }
  }, [isConnected, fetchEntries]);

  // Start timer
  const startTimer = useCallback(async (goalId: string, description: string) => {
    const response = await fetch('/api/clockify/start-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId, description }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Помилка запуску таймера');
    }

    // Refetch entries after a short delay to allow Clockify to update
    setTimeout(() => {
      fetchEntries();
    }, 2000);
  }, [fetchEntries]);

  const value: ClockifyContextType = {
    isConnected,
    connection,
    entries,
    loading,
    loadingEntries,
    error,
    refetchConnection: fetchConnection,
    refetchEntries: fetchEntries,
    startTimer,
  };

  return (
    <ClockifyContext.Provider value={value}>
      {children}
    </ClockifyContext.Provider>
  );
}

export function useClockify() {
  const context = useContext(ClockifyContext);
  if (context === undefined) {
    throw new Error('useClockify must be used within a ClockifyProvider');
  }
  return context;
}
