'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Goal, GoalCategory, GoalStatus } from '@/types';
import { getCategoryMeta, priorityLabels, statusLabels } from '@/lib/categoryConfig';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, BookOpen, Dumbbell, Palette, Clock, Calendar, ArrowLeft, Edit2, ExternalLink, TrendingUp, Info, Trash2, CalendarPlus, FileText } from 'lucide-react';
import Link from 'next/link';
import GoalForm from '@/components/goals/GoalForm';
import WeeklyProgress from '@/components/goals/WeeklyProgress';
import GoalWeekCalendar from '@/components/goals/GoalWeekCalendar';
import GoalNotes from '@/components/goals/GoalNotes';
import { useGoals } from '@/contexts/GoalsContext';
import { isPredefinedIcon, getIconById } from '@/lib/goalIcons';

const categoryIcons: Record<GoalCategory, React.ElementType> = {
  [GoalCategory.WORK_STARTUPS]: Briefcase,
  [GoalCategory.LEARNING]: BookOpen,
  [GoalCategory.HEALTH_SPORTS]: Dumbbell,
  [GoalCategory.HOBBIES]: Palette,
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.goalId as string;
  const { goals, updateGoal: updateGoalInContext, deleteGoal, loading } = useGoals();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  useEffect(() => {
    const foundGoal = goals.find(g => g.id === goalId);
    if (foundGoal) {
      setGoal(foundGoal);
    }
  }, [goalId, goals]);

  const handleProgressChange = async (newProgress: number) => {
    if (goal) {
      const updatedGoal = await updateGoalInContext(goal.id, {
        progressPercentage: newProgress,
      });
      if (updatedGoal) {
        setGoal(updatedGoal);
      }
    }
  };

  const handleStatusChange = async (newStatus: Goal['status']) => {
    if (goal) {
      const updatedGoal = await updateGoalInContext(goal.id, {
        status: newStatus,
      });
      if (updatedGoal) {
        setGoal(updatedGoal);
      }
    }
  };

  const handleDelete = async () => {
    if (goal && confirm(`Ви впевнені, що хочете видалити ціль "${goal.name}"?`)) {
      await deleteGoal(goal.id);
      router.push('/goals');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Завантаження...</p>
        </div>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Ціль не знайдено</h2>
          <p className="text-muted-foreground mb-6">Можливо, ця ціль була видалена або не існує</p>
          <Link href="/goals">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Повернутися до списку цілей
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const categoryMeta = getCategoryMeta(goal.category);
  const CategoryIcon = categoryIcons[goal.category];

  const priorityVariants = {
    critical: 'destructive' as const,
    high: 'default' as const,
    medium: 'secondary' as const,
    low: 'outline' as const,
  };

  const statusColors = {
    not_started: 'text-muted-foreground',
    in_progress: 'text-blue-600 dark:text-blue-400',
    on_hold: 'text-yellow-600 dark:text-yellow-400',
    completed: 'text-green-600 dark:text-green-400',
    abandoned: 'text-muted-foreground line-through',
    ongoing: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/goals"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Назад до цілей
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${categoryMeta.color}/0.1` }}>
              {goal.iconUrl && isPredefinedIcon(goal.iconUrl) ? (
                (() => {
                  const iconOption = getIconById(goal.iconUrl!);
                  if (iconOption) {
                    const IconComponent = iconOption.Icon;
                    return <IconComponent className="h-8 w-8" style={{ color: goal.color || categoryMeta.color }} />;
                  }
                  return <CategoryIcon className="h-8 w-8" style={{ color: categoryMeta.color }} />;
                })()
              ) : goal.iconUrl ? (
                <img
                  src={goal.iconUrl}
                  alt={goal.name}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <CategoryIcon className="h-8 w-8" style={{ color: categoryMeta.color }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-black dark:text-white">{goal.name}</h1>
                {goal.url && (
                  <a
                    href={goal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={goal.url}
                  >
                    <ExternalLink className="h-6 w-6" />
                  </a>
                )}
              </div>
              <p className="text-muted-foreground">{categoryMeta.name}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsEditFormOpen(true)} size="lg">
            <Edit2 className="mr-2 h-5 w-5" />
            Редагувати
          </Button>
          <Button onClick={handleDelete} size="lg" variant="outline" className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
            <Trash2 className="mr-2 h-5 w-5" />
            Видалити
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-4 mb-8">
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Прогрес тижня
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Додати подію
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Нотатки
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Загальна інформація
          </TabsTrigger>
        </TabsList>

        {/* Weekly Progress Tab */}
        <TabsContent value="progress">
          <WeeklyProgress goal={goal} />
        </TabsContent>

        {/* Week Calendar Tab */}
        <TabsContent value="calendar">
          <GoalWeekCalendar goal={goal} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <GoalNotes goalId={goal.id} />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="space-y-6">
            {/* Description Card */}
            {goal.description && (
              <Card className="bg-white dark:bg-card">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-black dark:text-white">Опис</h2>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{goal.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Status and Priority */}
            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <h2 className="text-xl font-semibold text-black dark:text-white">Статус та пріоритет</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Пріоритет</p>
                    <Badge variant={priorityVariants[goal.priority]} className="text-base">
                      {priorityLabels[goal.priority]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Статус</p>
                    <Badge variant="outline" className={`text-base ${statusColors[goal.status]}`}>
                      {statusLabels[goal.status]}
                    </Badge>
                  </div>
                </div>

                {/* Quick Status Change */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-black dark:text-white">Швидка зміна статусу</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={goal.status === GoalStatus.IN_PROGRESS ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(GoalStatus.IN_PROGRESS)}
                    >
                      В процесі
                    </Button>
                    <Button
                      size="sm"
                      variant={goal.status === GoalStatus.ON_HOLD ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(GoalStatus.ON_HOLD)}
                    >
                      Призупинено
                    </Button>
                    <Button
                      size="sm"
                      variant={goal.status === GoalStatus.COMPLETED ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(GoalStatus.COMPLETED)}
                    >
                      Завершено
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <h2 className="text-xl font-semibold text-black dark:text-white">Прогрес</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Виконано</span>
                      <span className="text-2xl font-bold text-black dark:text-white">{goal.progressPercentage}%</span>
                    </div>
                    <Progress value={goal.progressPercentage} className="h-3" />
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-2 pt-2">
                    <label htmlFor="progress-slider" className="text-sm font-medium text-black dark:text-white">
                      Швидке оновлення прогресу
                    </label>
                    <div className="relative pt-1">
                      <input
                        id="progress-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={goal.progressPercentage}
                        onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) ${goal.progressPercentage}%, hsl(var(--muted)) ${goal.progressPercentage}%)`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time and Dates */}
            <Card className="bg-white dark:bg-card">
              <CardHeader>
                <h2 className="text-xl font-semibold text-black dark:text-white">Часові рамки</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-5 w-5" />
                      <span>Час на тиждень</span>
                    </div>
                    <span className="text-xl font-semibold text-black dark:text-white">{goal.timeAllocated} год</span>
                  </div>

                  {!goal.isOngoing && goal.startDate && goal.targetEndDate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-5 w-5" />
                          <span>Дата початку</span>
                        </div>
                        <p className="text-lg font-semibold text-black dark:text-white">
                          {new Date(goal.startDate).toLocaleDateString('uk-UA', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-5 w-5" />
                          <span>Цільова дата завершення</span>
                        </div>
                        <p className="text-lg font-semibold text-black dark:text-white">
                          {new Date(goal.targetEndDate).toLocaleDateString('uk-UA', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {goal.actualEndDate && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-5 w-5" />
                        <span>Фактична дата завершення</span>
                      </div>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {new Date(goal.actualEndDate).toLocaleDateString('uk-UA', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Link */}
            {goal.url && (
              <Card className="bg-white dark:bg-card">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-black dark:text-white">Посилання на проект</h2>
                </CardHeader>
                <CardContent>
                  <a
                    href={goal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline break-all"
                  >
                    <ExternalLink className="h-5 w-5 flex-shrink-0" />
                    {goal.url}
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {goal.tags && goal.tags.length > 0 && (
              <Card className="bg-white dark:bg-card">
                <CardHeader>
                  <h2 className="text-xl font-semibold text-black dark:text-white">Теги</h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {goal.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Form Modal */}
      <GoalForm
        isOpen={isEditFormOpen}
        onClose={() => setIsEditFormOpen(false)}
        goalToEdit={goal}
        onGoalUpdated={(updatedGoal) => {
          setGoal(updatedGoal);
          setIsEditFormOpen(false);
        }}
      />
    </main>
  );
}
