'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useGoals } from '@/contexts/GoalsContext';
import { getCategoryMeta } from '@/lib/categoryConfig';
import { GoalCategory } from '@/types/goals';
import { Eye, EyeOff, RotateCcw, Repeat, Layers, Target as TargetIcon } from 'lucide-react';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';

interface CalendarVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showRecurringEvents: boolean;
  hiddenGoalIds: string[];
  hiddenCategories: GoalCategory[];
  onToggleRecurringEvents: () => void;
  onToggleGoalVisibility: (goalId: string) => void;
  onToggleCategoryVisibility: (category: GoalCategory) => void;
  onReset: () => void;
}

export function CalendarVisibilityDialog({
  open,
  onOpenChange,
  showRecurringEvents,
  hiddenGoalIds,
  hiddenCategories,
  onToggleRecurringEvents,
  onToggleGoalVisibility,
  onToggleCategoryVisibility,
  onReset,
}: CalendarVisibilityDialogProps) {
  const { goals } = useGoals();

  // Групуємо цілі за категоріями
  const goalsByCategory = goals.reduce((acc, goal) => {
    if (!acc[goal.category]) {
      acc[goal.category] = [];
    }
    acc[goal.category].push(goal);
    return acc;
  }, {} as Record<GoalCategory, typeof goals>);

  const categories = Object.keys(goalsByCategory) as GoalCategory[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Видимість подій</DialogTitle>
          <DialogDescription>
            Налаштуйте які події показувати в календарі
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              <span>Загальні</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Категорії</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4" />
              <span>Цілі</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Загальні */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3 flex-1">
                  <Checkbox
                    id="recurring-events"
                    checked={showRecurringEvents}
                    onCheckedChange={onToggleRecurringEvents}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="recurring-events"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Repeat className="h-4 w-4" />
                      Показувати в місячному вигляді
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Повторювані події завжди видимі в тижневому та денному розкладі
                    </p>
                  </div>
                </div>
                {showRecurringEvents ? (
                  <Eye className="h-5 w-5 text-primary flex-shrink-0" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              💡 За замовчуванням повторювані події приховані в місячному вигляді для кращої читабельності. Вони автоматично з'являються при перемиканні на тижневий або денний розклад.
            </div>
          </TabsContent>

          {/* Tab 2: Категорії */}
          <TabsContent value="categories" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Приховайте події всіх цілей певної категорії
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  У вас поки немає категорій з цілями
                </p>
              ) : (
                categories.map((category) => {
                  const meta = getCategoryMeta(category);
                  const isVisible = !hiddenCategories.includes(category);
                  const goalsInCategory = goalsByCategory[category] || [];

                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Checkbox
                          id={`category-${category}`}
                          checked={isVisible}
                          onCheckedChange={() => onToggleCategoryVisibility(category)}
                        />
                        <Label
                          htmlFor={`category-${category}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="font-medium">{meta.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({goalsInCategory.length} {goalsInCategory.length === 1 ? 'ціль' : 'цілей'})
                          </span>
                        </Label>
                      </div>
                      {isVisible ? (
                        <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Цілі */}
          <TabsContent value="goals" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Приховайте події конкретних цілей
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  У вас поки немає цілей
                </p>
              ) : (
                goals.map((goal) => {
                  const meta = getCategoryMeta(goal.category);
                  const isVisible = !hiddenGoalIds.includes(goal.id);
                  const isCategoryHidden = hiddenCategories.includes(goal.category);

                  return (
                    <div
                      key={goal.id}
                      className={`flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors ${
                        isCategoryHidden ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Checkbox
                          id={`goal-${goal.id}`}
                          checked={isVisible}
                          onCheckedChange={() => onToggleGoalVisibility(goal.id)}
                          disabled={isCategoryHidden}
                        />
                        <Label
                          htmlFor={`goal-${goal.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                        >
                          {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                            (() => {
                              const iconOption = getIconById(goal.iconUrl!);
                              if (iconOption) {
                                const IconComponent = iconOption.Icon;
                                return <IconComponent className="h-5 w-5 flex-shrink-0" style={{ color: goal.color || meta.color }} />;
                              }
                              return null;
                            })()
                          ) : goal.iconUrl ? (
                            <img
                              src={goal.iconUrl}
                              alt={goal.name}
                              className="h-5 w-5 object-contain flex-shrink-0"
                            />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: meta.color }}
                            />
                          )}
                          <span className="truncate font-medium">{goal.name}</span>
                          {isCategoryHidden && (
                            <span className="text-xs text-muted-foreground">(категорія прихована)</span>
                          )}
                        </Label>
                      </div>
                      {isVisible && !isCategoryHidden ? (
                        <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <Button onClick={onReset} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Скинути все
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="default">
            Готово
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
