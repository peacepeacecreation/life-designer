/**
 * Weekly Export API
 *
 * GET /api/export/weekly - Export aggregated data for current week
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerClient } from '@/lib/supabase/pool';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';
import { CalendarEventRow } from '@/types/calendar-events';
import { RecurringEventRow, parseRecurringEventFromDb } from '@/types/recurring-events';
import { startOfWeek, endOfWeek, isBefore, isWithinInterval } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 10;

// Helper: Calculate weekly time summary for all goals
interface WeeklyTimeSummary {
  totalAllocated: number;
  totalCompleted: number;
  totalScheduled: number;
  totalUnscheduled: number;
  otherPlansCompleted: number;
  otherPlansScheduled: number;
  completionRate: number;
}

function calculateWeeklyTimeSummary(
  goals: any[],
  recurringEvents: any[],
  calendarEvents: any[],
  weekStart: Date,
  weekEnd: Date
): WeeklyTimeSummary {
  const now = new Date();
  let totalAllocated = 0;
  let totalCompletedMinutes = 0;
  let totalScheduledMinutes = 0;
  let otherPlansCompletedMinutes = 0;
  let otherPlansScheduledMinutes = 0;

  // Sum up time allocated from all goals
  goals.forEach(goal => {
    totalAllocated += goal.time_allocated || 0;
  });

  // Get goal IDs
  const goalIds = goals.map(g => g.id);

  // Process recurring events
  recurringEvents.forEach((recurringEvent: any) => {
    if (!recurringEvent.is_active) return;

    // Generate instances for this week
    const instances = generateRecurringInstances(recurringEvent, weekStart, weekEnd);

    instances.forEach(instance => {
      const durationMinutes = recurringEvent.duration;
      const isCompleted = isBefore(instance.end, now);

      // Check if this event is associated with a goal
      if (recurringEvent.goal_id && goalIds.includes(recurringEvent.goal_id)) {
        // Part of goals
        if (isCompleted) {
          totalCompletedMinutes += durationMinutes;
        } else {
          totalScheduledMinutes += durationMinutes;
        }
      } else {
        // Other plans (not associated with goals)
        if (isCompleted) {
          otherPlansCompletedMinutes += durationMinutes;
        } else {
          otherPlansScheduledMinutes += durationMinutes;
        }
      }
    });
  });

  // Process calendar events
  calendarEvents.forEach((event: any) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    const isInWeek = isWithinInterval(eventStart, { start: weekStart, end: weekEnd }) ||
                     isWithinInterval(eventEnd, { start: weekStart, end: weekEnd });

    if (isInWeek) {
      const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
      const isCompleted = isBefore(eventEnd, now);

      // Check if this event is associated with a goal
      if (event.goal_id && goalIds.includes(event.goal_id)) {
        // Part of goals
        if (isCompleted) {
          totalCompletedMinutes += durationMinutes;
        } else {
          totalScheduledMinutes += durationMinutes;
        }
      } else {
        // Other plans (not associated with goals)
        if (isCompleted) {
          otherPlansCompletedMinutes += durationMinutes;
        } else {
          otherPlansScheduledMinutes += durationMinutes;
        }
      }
    }
  });

  const totalCompleted = totalCompletedMinutes / 60;
  const totalScheduled = totalScheduledMinutes / 60;
  const otherPlansCompleted = otherPlansCompletedMinutes / 60;
  const otherPlansScheduled = otherPlansScheduledMinutes / 60;
  const totalSpent = totalCompleted + totalScheduled;
  const totalUnscheduled = Math.max(0, totalAllocated - totalSpent);
  const completionRate = totalAllocated > 0 ? Math.round((totalCompleted / totalAllocated) * 100) : 0;

  return {
    totalAllocated: Math.round(totalAllocated * 10) / 10,
    totalCompleted: Math.round(totalCompleted * 10) / 10,
    totalScheduled: Math.round(totalScheduled * 10) / 10,
    totalUnscheduled: Math.round(totalUnscheduled * 10) / 10,
    otherPlansCompleted: Math.round(otherPlansCompleted * 10) / 10,
    otherPlansScheduled: Math.round(otherPlansScheduled * 10) / 10,
    completionRate,
  };
}

// Helper: Generate recurring event instances for a week
function generateRecurringInstances(recurringEvent: any, weekStart: Date, weekEnd: Date) {
  const instances = [];
  const [hours, minutes] = recurringEvent.start_time.split(':').map(Number);

  // Simple implementation: generate for each day if daily, or for specified days if weekly
  if (recurringEvent.frequency === 'daily') {
    const current = new Date(weekStart);
    while (current <= weekEnd) {
      const start = new Date(current);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + recurringEvent.duration);

      instances.push({ start, end });
      current.setDate(current.getDate() + 1);
    }
  } else if (recurringEvent.frequency === 'weekly' && recurringEvent.days_of_week) {
    const current = new Date(weekStart);
    while (current <= weekEnd) {
      const dayOfWeek = current.getDay();
      if (recurringEvent.days_of_week.includes(dayOfWeek)) {
        const start = new Date(current);
        start.setHours(hours, minutes, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + recurringEvent.duration);

        instances.push({ start, end });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return instances;
}

// Helper: Calculate time progress for a single goal
function calculateGoalTimeProgress(
  goalId: string,
  timeAllocated: number,
  recurringEvents: any[],
  calendarEvents: any[],
  weekStart: Date,
  weekEnd: Date
) {
  const now = new Date();
  let completedMinutes = 0;
  let scheduledMinutes = 0;
  const events: any[] = [];

  // Process recurring events for this goal
  recurringEvents
    .filter(event => event.is_active && event.goal_id === goalId)
    .forEach(recurringEvent => {
      const instances = generateRecurringInstances(recurringEvent, weekStart, weekEnd);

      instances.forEach(instance => {
        const durationMinutes = recurringEvent.duration;
        const isCompleted = isBefore(instance.end, now);

        if (isCompleted) {
          completedMinutes += durationMinutes;
        } else {
          scheduledMinutes += durationMinutes;
        }

        events.push({
          title: recurringEvent.title,
          start: instance.start,
          end: instance.end,
          isCompleted,
          duration: durationMinutes,
        });
      });
    });

  // Process calendar events for this goal
  calendarEvents
    .filter(event => event.goal_id === goalId)
    .forEach(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      const isInWeek = isWithinInterval(eventStart, { start: weekStart, end: weekEnd }) ||
                       isWithinInterval(eventEnd, { start: weekStart, end: weekEnd });

      if (isInWeek) {
        const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
        const isCompleted = isBefore(eventEnd, now);

        if (isCompleted) {
          completedMinutes += durationMinutes;
        } else {
          scheduledMinutes += durationMinutes;
        }

        events.push({
          title: event.title,
          start: eventStart,
          end: eventEnd,
          isCompleted,
          duration: durationMinutes,
        });
      }
    });

  const completed = completedMinutes / 60;
  const scheduled = scheduledMinutes / 60;
  const totalSpent = completed + scheduled;
  const unscheduled = Math.max(0, timeAllocated - totalSpent);

  return {
    totalAllocated: timeAllocated,
    completed: Math.round(completed * 10) / 10,
    scheduled: Math.round(scheduled * 10) / 10,
    unscheduled: Math.round(unscheduled * 10) / 10,
    events: events.sort((a, b) => a.start.getTime() - b.start.getTime()),
  };
}

// Helper: Get start and end of current week (Monday to Sunday)
function getWeekBounds(): { startOfWeek: Date; endOfWeek: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

// Helper: Format date to Ukrainian locale
function formatDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Helper: Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper: Format goal category
function formatCategory(category: GoalCategory): string {
  const categories: Record<GoalCategory, string> = {
    [GoalCategory.WORK_STARTUPS]: 'Робота та стартапи',
    [GoalCategory.LEARNING]: 'Навчання',
    [GoalCategory.HEALTH_SPORTS]: 'Здоров\'я та спорт',
    [GoalCategory.HOBBIES]: 'Хобі та розвиток',
  };
  return categories[category] || category;
}

// Helper: Format goal priority
function formatPriority(priority: GoalPriority): string {
  const priorities: Record<GoalPriority, string> = {
    [GoalPriority.CRITICAL]: 'Критичний',
    [GoalPriority.HIGH]: 'Високий',
    [GoalPriority.MEDIUM]: 'Середній',
    [GoalPriority.LOW]: 'Низький',
  };
  return priorities[priority] || priority;
}

// Helper: Format goal status
function formatStatus(status: GoalStatus): string {
  const statuses: Record<GoalStatus, string> = {
    [GoalStatus.NOT_STARTED]: 'Не розпочато',
    [GoalStatus.IN_PROGRESS]: 'В процесі',
    [GoalStatus.ON_HOLD]: 'На паузі',
    [GoalStatus.COMPLETED]: 'Завершено',
    [GoalStatus.ABANDONED]: 'Скасовано',
    [GoalStatus.ONGOING]: 'Постійна',
  };
  return statuses[status] || status;
}

/**
 * GET /api/export/weekly
 * Returns formatted text export of all data for current week
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Supabase client
    const supabase = getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 3. Get user ID
    const userResult: any = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.data.id;
    const { startOfWeek: weekStart, endOfWeek: weekEnd } = getWeekBounds();

    // 4. Fetch all data in parallel
    const [goalsResult, eventsResult, recurringResult, notesResult, reflectionsResult] = await Promise.all([
      // Goals (active ones)
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['in_progress', 'not_started', 'ongoing'])
        .order('display_order', { ascending: true }),

      // Calendar events for this week
      supabase
        .from('calendar_events')
        .select('*, goals(name, category, color)')
        .eq('user_id', userId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true }),

      // Recurring events (active)
      supabase
        .from('recurring_events')
        .select('*, goals(name, category)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('start_time', { ascending: true }),

      // Notes from this week
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: false }),

      // Reflections from this week
      supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .gte('reflection_date', weekStart.toISOString())
        .lte('reflection_date', weekEnd.toISOString())
        .order('reflection_date', { ascending: false }),
    ]);

    // 5. Calculate weekly time summary
    const summary = calculateWeeklyTimeSummary(
      goalsResult.data || [],
      recurringResult.data || [],
      eventsResult.data || [],
      weekStart,
      weekEnd
    );

    // 6. Format output as Markdown
    let output = '';

    // Header
    output += '# 📊 Тижневий звіт Life Designer\n\n';
    output += '## 📋 Загальна інформація\n\n';
    output += `- **Період**: ${formatDate(weekStart)} - ${formatDate(weekEnd)}\n`;
    output += `- **Користувач**: ${session.user.email}\n`;
    output += `- **Згенеровано**: ${formatDate(new Date())} о ${formatTime(new Date())}\n\n`;
    output += '---\n\n';

    // Weekly Time Calculator Section
    output += '## ⏱️ Тижневий калькулятор\n\n';
    output += '### Статистика часу на цілі\n\n';
    output += `- **Заплановано на тиждень**: ${summary.totalAllocated} год\n`;
    output += `- **Фактично виконано**: ${summary.totalCompleted} год\n`;
    output += `- **Заброньовано (майбутні події)**: ${summary.totalScheduled} год\n`;
    output += `- **Не заплановано**: ${summary.totalUnscheduled} год\n`;
    output += `- **Відсоток виконання**: ${summary.completionRate}%\n\n`;

    // Other plans (events without goals)
    const totalOtherPlans = summary.otherPlansCompleted + summary.otherPlansScheduled;
    if (totalOtherPlans > 0) {
      output += '### Інші плани (не пов\'язані з цілями)\n\n';
      output += `- **Всього**: ${Math.round(totalOtherPlans * 10) / 10} год\n`;
      output += `- **Виконано**: ${summary.otherPlansCompleted} год\n`;
      output += `- **Заплановано**: ${summary.otherPlansScheduled} год\n\n`;
      output += '_Це події та завдання, які не пов\'язані з вашими основними цілями._\n\n';
    }

    // Status assessment
    let statusEmoji = '🔴';
    let statusText = 'Потрібно підтягнути';
    if (summary.completionRate >= 100) {
      statusEmoji = '🎉';
      statusText = 'План виконано повністю!';
    } else if (summary.completionRate >= 80) {
      statusEmoji = '🟢';
      statusText = 'Чудовий прогрес!';
    } else if (summary.completionRate >= 50) {
      statusEmoji = '🟡';
      statusText = 'Добре йде';
    }

    output += `**Статус**: ${statusEmoji} ${statusText}\n\n`;

    // Insights
    if (summary.totalUnscheduled > 0) {
      output += `> ⚠️ **Увага**: Залишилось ${summary.totalUnscheduled} год не заброньовано. `;
      output += 'Рекомендується додати події в календар або створити повторювані події.\n\n';
    }

    if (summary.completionRate >= 100) {
      output += '> ✅ **Вітаємо!** Ви виконали весь запланований обсяг роботи на цей тиждень!\n\n';
    }

    output += '---\n\n';

    // Goals Section
    output += '## 🎯 Мої цілі\n\n';

    if (goalsResult.data && goalsResult.data.length > 0) {
      goalsResult.data.forEach((g: any, index: number) => {
        // Calculate time progress for this goal
        const goalProgress = calculateGoalTimeProgress(
          g.id,
          g.time_allocated || 0,
          recurringResult.data || [],
          eventsResult.data || [],
          weekStart,
          weekEnd
        );

        output += `### ${index + 1}. ${g.name}\n\n`;
        output += `- **Категорія**: ${formatCategory(g.category)}\n`;
        output += `- **Пріоритет**: ${formatPriority(g.priority)}\n`;

        if (g.description) {
          output += `- **Опис**: ${g.description}\n`;
        }

        output += '\n**⏱️ Калькулятор часу:**\n\n';
        output += `- Заплановано на тиждень: **${goalProgress.totalAllocated} год**\n`;
        output += `- ✅ Фактично виконано: **${goalProgress.completed} год**\n`;
        output += `- 📅 Заброньовано (майбутні): **${goalProgress.scheduled} год**\n`;
        output += `- ⚠️ Не заплановано: **${goalProgress.unscheduled} год**\n`;

        const goalCompletionRate = goalProgress.totalAllocated > 0
          ? Math.round((goalProgress.completed / goalProgress.totalAllocated) * 100)
          : 0;
        output += `- 📊 Виконання плану: **${goalCompletionRate}%**\n\n`;

        // Show events if any
        if (goalProgress.events.length > 0) {
          output += '**Події цього тижня:**\n\n';

          const completedEvents = goalProgress.events.filter(e => e.isCompleted);
          const scheduledEvents = goalProgress.events.filter(e => !e.isCompleted);

          if (completedEvents.length > 0) {
            output += '_Виконані:_\n';
            completedEvents.forEach(event => {
              const eventDate = formatDate(event.start);
              const eventTime = `${formatTime(event.start)} - ${formatTime(event.end)}`;
              const hours = Math.round(event.duration / 60 * 10) / 10;
              output += `- ✅ ${event.title} (${eventDate}, ${eventTime}, ${hours} год)\n`;
            });
            output += '\n';
          }

          if (scheduledEvents.length > 0) {
            output += '_Заплановані:_\n';
            scheduledEvents.forEach(event => {
              const eventDate = formatDate(event.start);
              const eventTime = `${formatTime(event.start)} - ${formatTime(event.end)}`;
              const hours = Math.round(event.duration / 60 * 10) / 10;
              output += `- 📅 ${event.title} (${eventDate}, ${eventTime}, ${hours} год)\n`;
            });
            output += '\n';
          }
        } else {
          output += '_Немає подій на цьому тижні для цієї цілі._\n\n';
        }

        if (g.tags && g.tags.length > 0) {
          output += `**Теги**: ${g.tags.map((t: string) => `\`${t}\``).join(', ')}\n\n`;
        }
        if (g.url) {
          output += `**Посилання**: [${g.url}](${g.url})\n\n`;
        }
      });
    } else {
      output += '_Немає активних цілей._\n\n';
    }

    // Calendar Events Section
    output += '---\n\n';
    output += '## 📆 Події календаря (цей тиждень)\n\n';

    if (eventsResult.data && eventsResult.data.length > 0) {
      eventsResult.data.forEach((e: any) => {
        const startTime = new Date(e.start_time);
        const endTime = new Date(e.end_time);

        output += `### 📅 ${e.title}\n\n`;
        output += `- **Дата**: ${formatDate(startTime)}\n`;
        output += `- **Час**: ${formatTime(startTime)} - ${formatTime(endTime)}\n`;
        if (e.description) {
          output += `- **Опис**: ${e.description}\n`;
        }
        if (e.location) {
          output += `- **Локація**: ${e.location}\n`;
        }
        if (e.goals) {
          output += `- **Пов'язана ціль**: ${e.goals.name}\n`;
        }
        output += '\n';
      });
    } else {
      output += '_Немає подій на цей тиждень._\n\n';
    }

    // Recurring Events Section
    output += '---\n\n';
    output += '## 🔄 Повторювані події\n\n';

    if (recurringResult.data && recurringResult.data.length > 0) {
      recurringResult.data.forEach((r: any) => {
        output += `### 🔁 ${r.title}\n\n`;
        output += `- **Час початку**: ${r.start_time}\n`;
        output += `- **Тривалість**: ${r.duration} хв\n`;
        output += `- **Частота**: ${r.frequency}\n`;
        if (r.days_of_week && r.days_of_week.length > 0) {
          const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
          const days = r.days_of_week.map((d: number) => dayNames[d]).join(', ');
          output += `- **Дні тижня**: ${days}\n`;
        }
        if (r.description) {
          output += `- **Опис**: ${r.description}\n`;
        }
        if (r.goals) {
          output += `- **Пов'язана ціль**: ${r.goals.name}\n`;
        }
        output += '\n';
      });
    } else {
      output += '_Немає активних повторюваних подій._\n\n';
    }

    // Notes Section
    output += '---\n\n';
    output += '## 📝 Нотатки (цей тиждень)\n\n';

    if (notesResult.data && notesResult.data.length > 0) {
      notesResult.data.forEach((n: any) => {
        const createdAt = new Date(n.created_at);
        output += `### 📄 ${n.title}\n\n`;
        output += `- **Створено**: ${formatDate(createdAt)} о ${formatTime(createdAt)}\n`;
        output += `- **Тип**: ${n.note_type}\n`;
        if (n.tags && n.tags.length > 0) {
          output += `- **Теги**: ${n.tags.map((t: string) => `\`${t}\``).join(', ')}\n`;
        }
        if (n.content) {
          output += '\n**Зміст:**\n\n';
          output += n.content + '\n';
        }
        output += '\n';
      });
    } else {
      output += '_Немає нотаток за цей тиждень._\n\n';
    }

    // Reflections Section
    output += '---\n\n';
    output += '## 🤔 Рефлексії (цей тиждень)\n\n';

    if (reflectionsResult.data && reflectionsResult.data.length > 0) {
      reflectionsResult.data.forEach((r: any) => {
        const reflectionDate = new Date(r.reflection_date);
        output += `### 💭 ${r.title}\n\n`;
        output += `- **Дата**: ${formatDate(reflectionDate)}\n`;
        output += `- **Тип**: ${r.reflection_type}\n`;
        if (r.mood_score) {
          output += `- **Настрій**: ${r.mood_score}/10\n`;
        }
        if (r.energy_level) {
          output += `- **Енергія**: ${r.energy_level}/10\n`;
        }
        if (r.tags && r.tags.length > 0) {
          output += `- **Теги**: ${r.tags.map((t: string) => `\`${t}\``).join(', ')}\n`;
        }
        if (r.content) {
          output += '\n**Зміст:**\n\n';
          output += r.content + '\n';
        }
        output += '\n';
      });
    } else {
      output += '_Немає рефлексій за цей тиждень._\n\n';
    }

    // Footer
    output += '---\n\n';
    output += '_Звіт згенеровано Life Designer_\n';

    // Return as Markdown
    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="life-designer-weekly-${weekStart.toISOString().split('T')[0]}.md"`,
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/export/weekly:', error);
    return NextResponse.json(
      { error: 'Failed to generate export', details: error.message },
      { status: 500 }
    );
  }
}
