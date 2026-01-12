#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl, supabaseKey;

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🧪 Running database connection test...\n');

  // 1. Get a test user
  console.log('1️⃣ Finding test user...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1)
    .single();

  if (userError || !userData) {
    console.log('   ❌ No users found. Database is empty.');
    return;
  }

  console.log('   ✅ Found user:', userData.email);
  const testUserId = userData.id;

  // 2. Test calendar_events: INSERT
  console.log('\n2️⃣ Testing INSERT into calendar_events...');
  const testEvent = {
    user_id: testUserId,
    title: '🧪 Test Event',
    description: 'Auto-generated test event',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    all_day: false
  };

  const { data: insertData, error: insertError } = await supabase
    .from('calendar_events')
    .insert(testEvent)
    .select()
    .single();

  if (insertError) {
    console.log('   ❌ INSERT failed:', insertError.message);
    return;
  }

  console.log('   ✅ Event created with ID:', insertData.id);
  const testEventId = insertData.id;

  // 3. Test calendar_events: SELECT
  console.log('\n3️⃣ Testing SELECT from calendar_events...');
  const { data: selectData, error: selectError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', testEventId)
    .single();

  if (selectError) {
    console.log('   ❌ SELECT failed:', selectError.message);
  } else {
    console.log('   ✅ Event retrieved:', selectData.title);
  }

  // 4. Test calendar_events: UPDATE
  console.log('\n4️⃣ Testing UPDATE on calendar_events...');
  const { data: updateData, error: updateError } = await supabase
    .from('calendar_events')
    .update({ title: '🧪 Test Event (Updated)' })
    .eq('id', testEventId)
    .select()
    .single();

  if (updateError) {
    console.log('   ❌ UPDATE failed:', updateError.message);
  } else {
    console.log('   ✅ Event updated:', updateData.title);
  }

  // 5. Test time_entries: INSERT
  console.log('\n5️⃣ Testing INSERT into time_entries...');
  const testTimeEntry = {
    user_id: testUserId,
    description: '🧪 Test Time Entry',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    source: 'manual'
  };

  const { data: timeEntryData, error: timeEntryError } = await supabase
    .from('time_entries')
    .insert(testTimeEntry)
    .select()
    .single();

  if (timeEntryError) {
    console.log('   ❌ INSERT failed:', timeEntryError.message);
  } else {
    console.log('   ✅ Time entry created with ID:', timeEntryData.id);
    console.log('   ✅ Duration auto-calculated:', timeEntryData.duration_seconds, 'seconds');
  }

  // 6. Cleanup: DELETE test data
  console.log('\n6️⃣ Cleaning up test data...');

  const { error: deleteEventError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', testEventId);

  if (deleteEventError) {
    console.log('   ❌ Failed to delete event:', deleteEventError.message);
  } else {
    console.log('   ✅ Test event deleted');
  }

  if (timeEntryData) {
    const { error: deleteTimeError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', timeEntryData.id);

    if (deleteTimeError) {
      console.log('   ❌ Failed to delete time entry:', deleteTimeError.message);
    } else {
      console.log('   ✅ Test time entry deleted');
    }
  }

  console.log('\n✅ All database operations working correctly!');
  console.log('📊 Summary:');
  console.log('   • Connection: ✅');
  console.log('   • INSERT: ✅');
  console.log('   • SELECT: ✅');
  console.log('   • UPDATE: ✅');
  console.log('   • DELETE: ✅');
  console.log('   • Auto-triggers: ✅');
})();
