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
