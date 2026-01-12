#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';

const PROJECT_REF = 'gxzzkcthcdtmkdwfdrhv';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4enprY3RoY2R0bWtkd2Zkcmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEzMzcyNSwiZXhwIjoyMDgzNzA5NzI1fQ.zdYn2LAFoAdMaf_ZNRHM3VTvOLUgolU6PLAPDj49Bvg';

async function executeSQLViaManagementAPI() {
  console.log('🚀 Виконання міграції через Supabase Management API...\n');

  const sql = fs.readFileSync('./supabase/migrations/004_add_payment_type_and_fixed_rate.sql', 'utf8');
  
  console.log('📄 SQL для виконання:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('');

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
        read_only: false
      })
    });

    const responseText = await response.text();
    
    console.log(`📡 Відповідь: HTTP ${response.status}`);
    console.log('');
    
    if (response.ok) {
      console.log('✅ Міграція виконана успішно!');
      console.log('Відповідь:', responseText || '{}');
      console.log('');
      console.log('Тепер можна:');
      console.log('1. Мігрувати 3 цілі з localStorage');
      console.log('2. Редагувати цілі через API');
      return true;
    } else {
      console.log('❌ Помилка виконання');
      console.log('Відповідь:', responseText);
      
      if (response.status === 401) {
        console.log('\n💡 Service Role Key не підходить для Management API');
        console.log('Потрібен Personal Access Token (PAT)\n');
        console.log('Як створити PAT:');
        console.log('1. Відкрийте https://supabase.com/dashboard/account/tokens');
        console.log('2. Натисніть "Generate new token"');
        console.log('3. Дайте назву та оберіть scope "database:write"');
        console.log('4. Скопіюйте токен і використайте замість SERVICE_ROLE_KEY');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Помилка:', error.message);
    return false;
  }
}

executeSQLViaManagementAPI();
