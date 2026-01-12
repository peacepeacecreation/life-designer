# Database Migrations

This directory contains SQL migrations for the Supabase database.

## Naming Convention

Migrations are numbered sequentially:
- `001_initial_schema.sql`
- `002_add_financial_tracking.sql`
- `003_setup_storage_for_icons.sql` (deleted)
- `004_add_payment_type_and_fixed_rate.sql`
- `005_add_calendar_events.sql` ⬅️ Current

## How to Apply Migrations

### Option 1: Supabase Dashboard (Quick)

1. Open SQL Editor: https://supabase.com/dashboard/project/gxzzkcthcdtmkdwfdrhv/sql
2. Copy migration SQL content
3. Paste and click "Run"

### Option 2: Supabase CLI (Recommended for development)

```bash
# Install CLI (if not installed)
brew install supabase/tap/supabase
# or
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref gxzzkcthcdtmkdwfdrhv

# Apply all pending migrations
supabase db push
```

### Option 3: GitHub Actions (Automatic)

When you push migrations to the `main` branch, they are automatically applied via GitHub Actions (see `.github/workflows/supabase-migrations.yml`).

## Migration Best Practices

1. **Always use transactions** - Wrap changes in BEGIN/COMMIT
2. **Make migrations idempotent** - Use `IF NOT EXISTS` where possible
3. **Test locally first** - Use Supabase local development
4. **Never modify old migrations** - Always create a new migration
5. **Add comments** - Explain what and why

## Current Schema

### Tables
- `users` - User accounts
- `goals` - User goals with categories and priorities
- `goal_connections` - Relationships between goals
- `notes` - User notes with goal associations
- `reflections` - Daily/weekly reflections
- `calendar_events` - Calendar events with goal associations ⬅️ NEW

### Features
- Full-text search (tsvector)
- Vector embeddings (pgvector)
- Row Level Security (RLS)
- Automatic timestamps
- Foreign key cascades
