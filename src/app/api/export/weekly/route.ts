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

export const runtime = 'nodejs';
export const maxDuration = 10;

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
    const { startOfWeek, endOfWeek } = getWeekBounds();

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
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
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
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())
        .order('created_at', { ascending: false }),

      // Reflections from this week
      supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .gte('reflection_date', startOfWeek.toISOString())
        .lte('reflection_date', endOfWeek.toISOString())
        .order('reflection_date', { ascending: false }),
    ]);

    // 5. Format output as Markdown
    let output = '';

    // Header
    output += '# 📊 Тижневий звіт Life Designer\n\n';
    output += '## 📋 Загальна інформація\n\n';
    output += `- **Період**: ${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}\n`;
    output += `- **Користувач**: ${session.user.email}\n`;
    output += `- **Згенеровано**: ${formatDate(new Date())} о ${formatTime(new Date())}\n\n`;
    output += '---\n\n';

    // Goals Section
    output += '## 🎯 Мої цілі\n\n';

    if (goalsResult.data && goalsResult.data.length > 0) {
      goalsResult.data.forEach((g: any, index: number) => {
        output += `### ${index + 1}. ${g.name}\n\n`;
        output += `- **Категорія**: ${formatCategory(g.category)}\n`;
        output += `- **Статус**: ${formatStatus(g.status)}\n`;
        output += `- **Пріоритет**: ${formatPriority(g.priority)}\n`;
        output += `- **Прогрес**: ${g.progress_percentage}%\n`;
        output += `- **Виділено часу**: ${g.time_allocated} год/тиждень\n`;
        if (g.description) {
          output += `- **Опис**: ${g.description}\n`;
        }
        if (g.tags && g.tags.length > 0) {
          output += `- **Теги**: ${g.tags.map((t: string) => `\`${t}\``).join(', ')}\n`;
        }
        if (g.url) {
          output += `- **Посилання**: [${g.url}](${g.url})\n`;
        }
        output += '\n';
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
        'Content-Disposition': `attachment; filename="life-designer-weekly-${startOfWeek.toISOString().split('T')[0]}.md"`,
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
