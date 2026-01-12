import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Simple authentication check
    if (password !== 'migrate-now-2025') {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '004_add_payment_type_and_fixed_rate.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Create admin client with service role
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Split SQL into individual statements
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);

    const results = [];

    for (const statement of statements) {
      try {
        // Try to execute via RPC if function exists
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement + ';'
        });

        if (error) {
          // If RPC doesn't work, try another approach
          throw error;
        }

        results.push({
          success: true,
          statement: statement.substring(0, 50) + '...'
        });
      } catch (error: any) {
        results.push({
          success: false,
          statement: statement.substring(0, 50) + '...',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Migration attempted. Check results for details.'
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message,
        suggestion: 'You may need to execute the SQL manually in Supabase Dashboard'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '004_add_payment_type_and_fixed_rate.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    return NextResponse.json({
      sql,
      dashboardUrl: 'https://supabase.com/dashboard/project/gxzzkcthcdtmkdwfdrhv/sql/new',
      instructions: [
        '1. Copy the SQL from the "sql" field above',
        '2. Open the Supabase SQL Editor using the dashboardUrl',
        '3. Paste and execute the SQL',
        '4. Return here to migrate your goals'
      ]
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
