# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life Designer is a Next.js 16 application for personal life planning and management. It runs on port 3077 and uses the App Router architecture.

## Package Manager

This project uses **pnpm** (not npm). All dependency commands must use pnpm:
- Install dependencies: `pnpm install`
- Add package: `pnpm add <package>`
- Add dev dependency: `pnpm add -D <package>`

## Development Commands

```bash
pnpm dev           # Start dev server on http://localhost:3077
pnpm build         # Build for production
pnpm start         # Start production server
pnpm lint          # Run ESLint
pnpm lint:fix      # Run ESLint with auto-fix
pnpm type-check    # Run TypeScript type checking without emitting files
```

**Database Commands:**
```bash
pnpm db:migrate        # Run database migration script
pnpm db:test           # Test database connection and CRUD operations
pnpm db:copy-migration # Copy latest migration SQL to clipboard
```

**Important**: NEVER run `pnpm dev` or `npm run dev` unless explicitly requested by the user.

## Architecture

### Directory Structure

```
src/
├── app/              # Next.js App Router pages and layouts
│   ├── layout.tsx    # Root layout with Inter font and global styles
│   ├── page.tsx      # Home page with navigation cards
│   └── calendar/     # Calendar feature page
├── components/       # Reusable React components
│   └── CalendarComponent.tsx  # Calendar component using react-big-calendar
└── lib/
    └── utils.ts      # Utility functions (cn for className merging)
```

### Key Technologies

- **Next.js 16.1.1** with App Router
- **React 19.2.3** with React Server Components
- **TypeScript 5** with strict mode enabled
- **Tailwind CSS 4** with custom design tokens
- **react-big-calendar** for calendar functionality with `date-fns` localizer
- **Ukrainian locale** (`uk` from `date-fns/locale`) for calendar

### Design System

The project uses a custom design system defined in `src/app/globals.css` with CSS variables:
- Color tokens: background, foreground, card, primary, secondary, muted, accent, destructive, border
- Automatic dark mode support via `prefers-color-scheme`
- All colors use HSL format: `hsl(var(--variable-name))`
- Utility function `cn()` in `src/lib/utils.ts` for merging Tailwind classes

### TypeScript Configuration

- Path alias: `@/*` maps to `./src/*`
- Import example: `import CalendarComponent from '@/components/CalendarComponent'`
- Strict mode enabled
- Target: ES2017

## Calendar Feature

The calendar uses `react-big-calendar` with:
- Ukrainian localization
- Event creation via slot selection
- Event viewing via event click
- Multiple views: month, week, day, agenda
- Prepared for future integration with Google Calendar API and Apple Calendar (CalDAV)

## Environment Variables

Copy `.env.local.example` to `.env.local` for local development. Default app URL is `http://localhost:3077`.

## Styling Conventions

- Use Tailwind utility classes for styling
- Custom component styles go in `globals.css` with appropriate scoping
- Calendar styles use design system tokens (e.g., `hsl(var(--border))`)
- Prefer design system tokens over hardcoded colors

## Database Migrations

This project uses Supabase PostgreSQL with migration files in `supabase/migrations/`.

### Running Migrations

**Recommended Method: Bash Script**
```bash
./scripts/run-migration.sh
```

This script uses the Supabase Management API to execute migrations. It will:
1. Read the migration SQL file (automatically configured in the script)
2. Display the SQL to be executed
3. Load `SUPABASE_PAT` from `.env.local`
4. Execute via Management API endpoint: `https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query`
5. Show success/failure status

**Setup Requirements:**
Add your Supabase Personal Access Token to `.env.local`:
```bash
SUPABASE_PAT=sbp_your_token_here
```

**When to Update the Script:**
After creating a new migration file, update line 4 in `scripts/run-migration.sh`:
```bash
SQL_FILE="supabase/migrations/XXX_your_migration.sql"
```

### Getting Personal Access Token (PAT)

The migration script requires a PAT (not the service role key):
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name: "CLI Migrations"
4. Scope: **All access** (or minimum `database:write`)
5. Copy the token (starts with `sbp_`)
6. Add to `.env.local`: `SUPABASE_PAT=sbp_...`

### Alternative: Manual Execution via Dashboard

If the script fails, manually execute via Supabase Dashboard:
1. Copy SQL: `pnpm db:copy-migration` (copies to clipboard)
2. Open SQL Editor: https://supabase.com/dashboard/project/gxzzkcthcdtmkdwfdrhv/sql/new
3. Paste and click "Run"

### Important Notes

- **Service Role Key** - Used for API routes with RLS bypass, NOT for Management API
- **Personal Access Token (PAT)** - Required for Management API `database/query` endpoint
- **Anon Key** - Client-side API key with RLS enforcement
- Supabase REST API (`/rest/v1/`) does NOT support raw SQL execution for security
- Direct `psql` connections may be restricted; use Management API instead
