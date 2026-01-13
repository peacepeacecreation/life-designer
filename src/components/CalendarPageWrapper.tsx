'use client';

import { useState } from 'react';
import CalendarComponent from '@/components/CalendarComponent';
import RecurringEventsPanel from '@/components/RecurringEventsPanel';
import { CalendarSyncBanner } from '@/components/calendar/CalendarSyncBanner';
import { Button } from '@/components/ui/button';
import { Settings2, Eye } from 'lucide-react';
import { CalendarSettingsDialog } from '@/components/calendar/CalendarSettingsDialog';
import { CalendarVisibilityDialog } from '@/components/calendar/CalendarVisibilityDialog';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarVisibility } from '@/hooks/useCalendarVisibility';

export default function CalendarPageWrapper() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarComponent googleEvents={googleEvents} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <RecurringEventsPanel />
            <CalendarSyncBanner onGoogleEventsLoaded={setGoogleEvents} />
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
