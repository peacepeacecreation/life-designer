'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CalendarComponent from '@/components/CalendarComponent';
import RecurringEventsPanel from '@/components/RecurringEventsPanel';
import { CalendarSyncBanner } from '@/components/calendar/CalendarSyncBanner';
import { ConnectCalendarButton } from '@/components/calendar/ConnectCalendarButton';
import { Button } from '@/components/ui/button';
import { Settings2, Eye } from 'lucide-react';
import { CalendarSettingsDialog } from '@/components/calendar/CalendarSettingsDialog';
import { CalendarVisibilityDialog } from '@/components/calendar/CalendarVisibilityDialog';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarVisibility } from '@/hooks/useCalendarVisibility';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function CalendarPageWrapper() {
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { settings, updateSettings, resetSettings } = useCalendarSettings();
  const {
    showRecurringEvents,
    hiddenGoalIds,
    hiddenCategories,
    toggleRecurringEvents,
    toggleGoalVisibility,
    toggleCategoryVisibility,
    resetSettings: resetVisibility,
  } = useCalendarVisibility();

  // Check calendar connection status
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/calendar/status');
        const data = await response.json();
        setIsCalendarConnected(data.connected);
      } catch (error) {
        console.error('Error checking calendar status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkStatus();
  }, []);

  // Handle OAuth callback success
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === 'true') {
      setIsCalendarConnected(true);
      setShowSuccessMessage(true);

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);

      // Clean up URL
      window.history.replaceState({}, '', '/calendar');
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Календар</h1>
            <p className="text-muted-foreground">
              Керуйте своїми подіями та планами. Натисніть на вільний час, щоб додати нову подію.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setVisibilityOpen(true)}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Видимість подій"
            >
              <Eye className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setSettingsOpen(true)}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Налаштування часу"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Success message after connecting */}
        {showSuccessMessage && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Google Calendar успішно підключено! Події синхронізуються автоматично.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarComponent googleEvents={googleEvents} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <RecurringEventsPanel />

            {/* Show Connect button if not connected, otherwise show sync banner */}
            {checkingStatus ? (
              <div className="text-center p-4 text-muted-foreground">
                Перевірка підключення...
              </div>
            ) : isCalendarConnected ? (
              <CalendarSyncBanner onGoogleEventsLoaded={setGoogleEvents} />
            ) : (
              <ConnectCalendarButton
                isConnected={false}
                onConnect={() => setCheckingStatus(true)}
              />
            )}
          </div>
        </div>

        {/* Settings Dialog */}
        <CalendarSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onSave={updateSettings}
          onReset={resetSettings}
        />

        {/* Visibility Dialog */}
        <CalendarVisibilityDialog
          open={visibilityOpen}
          onOpenChange={setVisibilityOpen}
          showRecurringEvents={showRecurringEvents}
          hiddenGoalIds={hiddenGoalIds}
          hiddenCategories={hiddenCategories}
          onToggleRecurringEvents={toggleRecurringEvents}
          onToggleGoalVisibility={toggleGoalVisibility}
          onToggleCategoryVisibility={toggleCategoryVisibility}
          onReset={resetVisibility}
        />
      </div>
    </main>
  );
}
