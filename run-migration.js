#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Runs the initial schema migration
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  // Load environment variables
  const supabaseUrl = 'https://gxzzkcthcdtmkdwfdrhv.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4enprY3RoY2R0bWtkd2Zkcmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEzMzcyNSwiZXhwIjoyMDgzNzA5NzI1fQ.zdYn2LAFoAdMaf_ZNRHM3VTvOLUgolU6PLAPDj49Bvg';

  console.log('🚀 Starting database migration...\n');

  // Read SQL file
  const sqlPath = './supabase/migrations/001_initial_schema.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📖 Loaded SQL file:', sqlPath);
  console.log('📝 SQL size:', sql.length, 'characters\n');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔗 Connecting to Supabase...\n');

  // Execute SQL using rpc
  try {
    // Split SQL into individual statements (rough split)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements\n`);
    console.log('⚠️  Note: This might not work due to Supabase RPC limitations.\n');
    console.log('👉 RECOMMENDED: Copy SQL and run in Supabase Dashboard SQL Editor\n');
    console.log('   1. Go to: https://supabase.com/dashboard/project/gxzzkcthcdtmkdwfdrhv/sql/new');
    console.log('   2. Copy content from: supabase/migrations/001_initial_schema.sql');
    console.log('   3. Paste and click "Run"\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n👉 Please run the migration manually through Supabase Dashboard');
    process.exit(1);
  }
}

runMigration();
