'use client';

import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRecurringEvents } from '@/contexts/RecurringEventsContext';
import { useGoals } from '@/contexts/GoalsContext';
import { getSeedRecurringEvents } from '@/utils/seedRecurringEvents';
import { getRecurrenceDescription } from '@/utils/recurringEvents';
import { getCategoryMeta } from '@/lib/categoryConfig';
import { Sparkles, ToggleLeft, ToggleRight, Trash2, Clock, Plus, Pencil, Target } from 'lucide-react';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';
import { AddRecurringEventDialog } from '@/components/calendar/AddRecurringEventDialog';
import { EditRecurringEventDialog } from '@/components/calendar/EditRecurringEventDialog';
import { RecurringEvent } from '@/types/recurring-events';

export default function RecurringEventsPanel() {
  const {
    recurringEvents,
    addRecurringEvent,
    updateRecurringEvent,
    deleteRecurringEvent,
    toggleRecurringEvent,
  } = useRecurringEvents();
  const { goals } = useGoals();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<RecurringEvent | null>(null);

  // Функція для знаходження цілі за ID
  const getGoalById = (goalId?: string) => {
    if (!goalId) return null;
    return goals.find((goal) => goal.id === goalId);
  };

  const handleLoadExamples = async () => {
    try {
      const seedEvents = getSeedRecurringEvents();
      for (const event of seedEvents) {
        await addRecurringEvent(event);
      }
    } catch (error) {
      console.error('Error loading example events:', error);
      toast({ variant: "destructive", title: "Помилка", description: "Помилка при завантаженні подій. Спробуйте ще раз." });
    }
  };

  const handleEditClick = (event: RecurringEvent) => {
    setEventToEdit(event);
    setEditDialogOpen(true);
  };

  if (recurringEvents.length === 0) {
    return (
      <>
        <Card className="p-6">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Немає повторюваних подій</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Додайте регулярні події, які повторюються щодня/щотижня
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialogOpen(true)} variant="default" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Додати подію
              </Button>
              <Button onClick={handleLoadExamples} variant="outline" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Додати мої созвони
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              13:00 (Пн-Пт) • 20:00 (Пн/Ср/Пт)
            </p>
          </div>
        </Card>

        <AddRecurringEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={addRecurringEvent}
        />
      </>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Повторювані події</h3>
        <div className="space-y-3 mb-4">
          {recurringEvents.map((event) => {
            const goal = getGoalById(event.goalId);
            const categoryMeta = goal ? getCategoryMeta(goal.category) : null;

            return (
              <div
                key={event.id}
                className={`p-3 rounded-lg border ${
                  event.isActive
                    ? 'border-border bg-card'
                    : 'border-muted bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{event.title}</h4>
                      <span
                        className="inline-block px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: event.color
                            ? `${event.color}20`
                            : 'transparent',
                          color: event.color,
                        }}
                      >
                        {event.startTime}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getRecurrenceDescription(event.recurrence)}
                    </p>
                    {goal && (
                      <div
                        className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: categoryMeta?.color ? `${categoryMeta.color}15` : 'transparent',
                        }}
                      >
                        {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                          (() => {
                            const iconOption = getIconById(goal.iconUrl!);
                            if (iconOption) {
                              const IconComponent = iconOption.Icon;
                              return <IconComponent className="h-3.5 w-3.5" style={{ color: goal.color || categoryMeta?.color }} />;
                            }
                            return null;
                          })()
                        ) : goal.iconUrl ? (
                          <img
                            src={goal.iconUrl}
                            alt={goal.name}
                            className="h-3.5 w-3.5 object-contain"
                          />
                        ) : (
                          <Target className="h-3.5 w-3.5" style={{ color: categoryMeta?.color }} />
                        )}
                        <span className="text-xs font-medium text-black dark:text-white">
                          {goal.name}
                        </span>
                      </div>
                    )}
                  </div>
                <div className="flex gap-0.5">
                  <Button
                    onClick={async () => {
                      try {
                        await toggleRecurringEvent(event.id);
                      } catch (error) {
                        console.error('Error toggling event:', error);
                        toast({ variant: "destructive", title: "Помилка", description: "Помилка при зміні статусу події" });
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {event.isActive ? (
                      <ToggleRight className="h-4 w-4 text-primary" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleEditClick(event)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: "Видалити подію?",
                        description: "Ви впевнені, що хочете видалити цю подію?",
                        variant: "destructive"
                      });
                      if (confirmed) {
                        try {
                          await deleteRecurringEvent(event.id);
                        } catch (error) {
                          console.error('Error deleting event:', error);
                          toast({ variant: "destructive", title: "Помилка", description: "Помилка при видаленні події" });
                        }
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Додати подію
        </Button>
      </Card>

      <AddRecurringEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={addRecurringEvent}
      />

      <EditRecurringEventDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        event={eventToEdit}
        onUpdate={updateRecurringEvent}
      />
    </>
  );
}
