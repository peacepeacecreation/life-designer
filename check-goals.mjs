#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://gxzzkcthcdtmkdwfdrhv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4enprY3RoY2R0bWtkd2Zkcmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEzMzcyNSwiZXhwIjoyMDgzNzA5NzI1fQ.zdYn2LAFoAdMaf_ZNRHM3VTvOLUgolU6PLAPDj49Bvg';

async function checkGoals() {
  console.log('🔍 Перевірка goals в Supabase...\n');

  try {
    // Get all goals
    const response = await fetch(`${SUPABASE_URL}/rest/v1/goals?select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const goals = await response.json();

    console.log(`📊 Знайдено цілей у базі: ${goals.length}\n`);

    if (goals.length === 0) {
      console.log('❌ База даних порожня!');
      return;
    }

    console.log('📋 Список цілей:\n');
    goals.forEach((goal, index) => {
      console.log(`${index + 1}. ${goal.name}`);
      console.log(`   ID: ${goal.id}`);
      console.log(`   User ID: ${goal.user_id}`);
      console.log(`   Priority: ${goal.priority}`);
      console.log(`   Category: ${goal.category}`);
      console.log(`   Has embedding: ${goal.embedding ? 'ТАК ✅' : 'НІ ❌'}`);
      console.log(`   Created: ${new Date(goal.created_at).toLocaleString('uk-UA')}`);
      console.log('');
    });

    // Check unique user_ids
    const userIds = [...new Set(goals.map(g => g.user_id))];
    console.log(`👥 Унікальних користувачів: ${userIds.length}`);
    userIds.forEach((userId, index) => {
      const userGoals = goals.filter(g => g.user_id === userId);
      console.log(`   ${index + 1}. User ID: ${userId} (${userGoals.length} цілей)`);
    });

  } catch (error) {
    console.error('❌ Помилка:', error.message);
  }
}

checkGoals();
