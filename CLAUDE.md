# CLAUDE.md

## Project overview

Urbane Calendar is a multi-tenant scheduling app for bicycle shop service/repair departments. It connects to Lightspeed (point-of-sale) via the Lightspeed API to pull in work orders, then provides a drag-and-drop calendar view for scheduling mechanics and managing jobs. Think of it as an improved scheduling UI on top of Lightspeed's data.

## Tech stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **Database**: Supabase (Postgres) with RLS and real-time subscriptions
- **Auth**: Supabase Auth (email/password) with `@supabase/ssr`
- **UI**: shadcn/ui (new-york style, neutral base), Tailwind CSS v3, Radix primitives, Lucide icons
- **Drag-and-drop**: dnd-kit (`@dnd-kit/core`)
- **Email**: Resend (invitation emails)
- **Language**: TypeScript (strict mode)
- **Package manager**: npm

## Commands

```bash
# Development
npm run dev                 # Start dev server with Turbopack

# Build & production
npm run build               # Production build
npm run start               # Start production server
npm run lint                # Run ESLint

# Database (requires Supabase CLI + Docker for local)
npm run db:push             # Push migrations to linked Supabase project
npm run db:reset            # Reset local DB, run migrations, then seed.sql (Docker required)
npm run setup-supabase      # Run setup script
```

## Architecture conventions

See `.claude/rules/` for detailed guidance on each area:

| Rule file | Covers |
|---|---|
| `supabase-client-strategy.md` | Four Supabase clients (browser/server/middleware/service), when to use each |
| `mutation-strategy.md` | Server Actions (`lib/actions/`) vs client-side DB calls (`lib/database/`) |
| `multi-tenant-auth.md` | Shop isolation via JWT → `get_user_shop_id()` PG function → RLS |
| `real-time-subscriptions.md` | Supabase Realtime patterns, channel naming, closure safety |
| `component-conventions.md` | Server-first components, `@/` imports, shadcn/ui patterns |
| `types-organization.md` | Manual types in `lib/types/` vs co-located in `lib/database/` |
| `migrations.md` | SQL migration idempotency, RLS policies, grants |
| `nextjs-error-handling.md` | `error.tsx` boundaries, `ErrorCard`, `getErrorMessage` |
| `nextjs-loading.md` | `loading.tsx` boundaries, `Skeleton` component |
| `seeding.md` | Seed data architecture (local vs live Supabase) |

### Key principles

- **Server by default**: Components are Server Components unless they need interactivity. Extract `'use client'` children for interactive parts.
- **All imports use `@/` path alias** (maps to project root). No relative imports across directories.
- **No barrel exports** — import directly from source files.
- **Server Actions for mutations**: Auth-critical operations (memberships, invitations, roles) go through `lib/actions/`. Client-side DB functions (`lib/database/calendar.ts`) handle real-time collaborative data (jobs, scheduling).
- **RLS-first**: All queries use the anon-key client with RLS enforcement. The service-role client is reserved for bootstrap operations only (creating first shop, accepting invitations).
- **Named exports preferred** — default exports only for Next.js page components.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=           # From Supabase dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only — bypasses RLS
RESEND_API_KEY=                     # For sending invitation emails
LIGHTSPEED_CLIENT_ID=               # Lightspeed OAuth app client ID
LIGHTSPEED_CLIENT_SECRET=           # Lightspeed OAuth app client secret
LIGHTSPEED_REDIRECT_URI=            # Lightspeed OAuth callback URL (e.g. https://localhost:3000/api/lightspeed/callback)
```

`.env.local` is git-ignored. `.claude/settings.local.json` is also git-ignored (personal preferences).
