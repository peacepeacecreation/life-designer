'use client';

import { useMemo } from 'react';
import { Goal, GoalCategory } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { categoryMeta } from '@/lib/categoryConfig';
import { Target, TrendingUp, Award, Zap } from 'lucide-react';

interface FutureProfileProps {
  goals: Goal[];
}

export function FutureProfile({ goals }: FutureProfileProps) {
  // Розподіл часу по категоріях (у відсотках)
  const timeDistribution = useMemo(() => {
    const totalTime = goals.reduce((sum, g) => sum + g.timeAllocated, 0);
    if (totalTime === 0) return [];

    const distribution = categoryMeta.map(cat => {
      const categoryTime = goals
        .filter(g => g.category === cat.id)
        .reduce((sum, g) => sum + g.timeAllocated, 0);

      return {
        category: cat,
        hours: categoryTime,
        percentage: (categoryTime / totalTime) * 100,
      };
    }).filter(d => d.hours > 0);

    return distribution.sort((a, b) => b.percentage - a.percentage);
  }, [goals]);

  // Визначення головного фокусу (категорія з найбільшим часом)
  const mainFocus = useMemo(() => {
    if (timeDistribution.length === 0) return null;
    return timeDistribution[0];
  }, [timeDistribution]);

  // Топ навички які розвиваються (базуючись на тегах)
  const topSkills = useMemo(() => {
    const skillCount: Record<string, number> = {};

    goals.forEach(goal => {
      goal.tags.forEach(tag => {
        skillCount[tag] = (skillCount[tag] || 0) + goal.timeAllocated;
      });
    });

    return Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, hours]) => ({ skill, hours }));
  }, [goals]);

  // Середній прогрес цілей
  const avgProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    return goals.reduce((sum, g) => sum + g.0, // progressPercentage removed 0) / goals.length;
  }, [goals]);

  // Прогноз "Ким станеш" базуючись на розподілі часу
  const futureProfile = useMemo(() => {
    if (!mainFocus) return null;

    const profiles: Record<GoalCategory, { title: string; description: string; skills: string[] }> = {
      [GoalCategory.WORK_STARTUPS]: {
        title: 'Підприємець та бізнес-лідер',
        description: 'Ти інвестуєш найбільше часу в роботу та стартапи. Через рік ти станеш досвідченим підприємцем з глибоким розумінням бізнес-процесів.',
        skills: ['Управління проектами', 'Лідерство', 'Стратегічне мислення', 'Бізнес-аналітика'],
      },
      [GoalCategory.LEARNING]: {
        title: 'Експерт та професіонал',
        description: 'Твій головний фокус - професійний розвиток та навчання. Ти стаєш експертом у своїй галузі з широкою базою знань.',
        skills: ['Глибокі технічні знання', 'Аналітичне мислення', 'Інновації', 'Адаптивність'],
      },
      [GoalCategory.HEALTH_SPORTS]: {
        title: 'Спортивна та здорова людина',
        description: 'Ти приділяєш найбільше уваги здоров\'ю та спорту. Твоє тіло та розум будуть у відмінній формі.',
        skills: ['Фізична витривалість', 'Дисципліна', 'Ментальна стійкість', 'Здоровий спосіб життя'],
      },
      [GoalCategory.HOBBIES]: {
        title: 'Творча особистість',
        description: 'Твої хобі та особисті інтереси займають центральне місце. Ти розвиваєш унікальні творчі здібності.',
        skills: ['Творчість', 'Самовираження', 'Майстерність', 'Інноваційність'],
      },
    };

    return profiles[mainFocus.category.id];
  }, [mainFocus]);

  // Баланс життя (наскільки збалансовано розподілений час)
  const lifeBalance = useMemo(() => {
    if (timeDistribution.length === 0) return 0;

    // Ідеальний баланс - коли час більш-менш рівномірно розподілений
    const idealPercentage = 100 / categoryMeta.length;
    const deviations = timeDistribution.map(d => Math.abs(d.percentage - idealPercentage));
    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // Чим менша середня девіація, тим кращий баланс (max 100%)
    return Math.max(0, 100 - avgDeviation);
  }, [timeDistribution]);

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Додайте цілі щоб побачити ваш профіль майбутнього
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Профіль майбутнього */}
      {futureProfile && mainFocus && (
        <Card className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-card dark:to-gray-900 border-2">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#93c5fd20' }}>
              <Award className="h-8 w-8" style={{ color: '#93c5fd' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Через рік ти станеш: {futureProfile.title}</h2>
              <p className="text-muted-foreground">{futureProfile.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: '#fcd34d' }} />
                Ключові навички які ти розвинеш:
              </h3>
              <div className="flex flex-wrap gap-2">
                {futureProfile.skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Статистика розвитку */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Середній прогрес</h3>
          </div>
          <p className="text-3xl font-bold">{avgProgress.toFixed(1)}%</p>
          <Progress value={avgProgress} className="mt-2 h-2" />
        </Card>

        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Головний фокус</h3>
          </div>
          {mainFocus && (
            <>
              <p className="text-xl font-bold">{mainFocus.category.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {mainFocus.percentage.toFixed(1)}% часу ({mainFocus.hours} год/тиждень)
              </p>
            </>
          )}
        </Card>

        <Card className="p-6 bg-white dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground">Баланс життя</h3>
          </div>
          <p className="text-3xl font-bold">{lifeBalance.toFixed(0)}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {lifeBalance > 70 ? 'Чудовий баланс' : lifeBalance > 40 ? 'Непоганий баланс' : 'Потрібно більше балансу'}
          </p>
        </Card>
      </div>

      {/* Розподіл часу */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Куди ти рухаєшся (розподіл часу)</h2>
        <div className="space-y-4">
          {timeDistribution.map((dist, index) => (
            <Card key={dist.category.id} className="p-6 bg-white dark:bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dist.category.icon}</span>
                  <div>
                    <h3 className="font-semibold">{dist.category.name}</h3>
                    <p className="text-sm text-muted-foreground">{dist.category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{dist.percentage.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">{dist.hours} год/тиждень</p>
                </div>
              </div>
              <Progress value={dist.percentage} className="h-3" />
              {index === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Твій головний пріоритет 🎯</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Топ навички */}
      {topSkills.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Топ навички які ти розвиваєш</h2>
          <div className="flex flex-wrap gap-3">
            {topSkills.map(({ skill, hours }) => (
              <Badge
                key={skill}
                variant="outline"
                className="px-4 py-2 text-sm"
                style={{ borderColor: '#93c5fd', color: '#93c5fd' }}
              >
                {skill} ({hours} год/тиждень)
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
