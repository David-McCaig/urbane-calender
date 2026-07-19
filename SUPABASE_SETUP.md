# Supabase Calendar Setup

This guide will help you set up the Supabase database schema and migrations for the Urbane Calendar application.

## Prerequisites

1. **Supabase CLI installed**: Follow the [Supabase CLI installation guide](https://supabase.com/docs/guides/cli)
2. **Supabase project created**: Create a new project at [supabase.com](https://supabase.com)
3. **Environment variables configured**: Make sure your `.env.local` file has the correct Supabase credentials

## Setup Instructions

### 1. Initialize Supabase in your project

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Run the migrations

The migration files are located in the `supabase/migrations/` directory:

- `20241201000001_create_calendar_schema.sql` — Creates the core tables (shops, mechanics, jobs, scheduled_jobs, work_order_statuses)
- `20241201000002_setup_rls_policies.sql` — Sets up Row Level Security policies + `get_user_shop_id()` function
- `20241201000003_seed_data.sql` — Inserts seed data + enables realtime publication
- `20251003210859_update_shop_id.sql` — Shop ID migration utility
- `20250625000001_add_membership_system.sql` — Multi-user membership system (user_shop_memberships, invitations, role-based RLS)
- `20260625000000_add_replica_identity.sql` — Enables `REPLICA IDENTITY FULL` for realtime tables

```bash
# Apply all migrations to your remote database
supabase db push

# Or if you want to run migrations locally first
supabase db reset
```

### 3. User and shop membership setup

Shop access is managed through the **membership system** (`user_shop_memberships` table). When a user signs up with a shop name, they automatically become the owner of that shop. When invited via an invitation link, they join as the role specified by the inviter.

The `get_user_shop_id()` function resolves the user's active shop through a fallback chain:
1. `active_shop_id` in user metadata (set when creating/joining/selecting a shop)
2. Legacy `shop_id` in user metadata (for backward compatibility)
3. Legacy `shop_id` in app metadata
4. First membership row from `user_shop_memberships`

Existing users from before the membership system was added are automatically backfilled as owners of their shops by the `20250625000001` migration.

### 4. Real-time

Real-time is configured in the migrations:
- The `supabase_realtime` publication includes `shops`, `mechanics`, `jobs`, `scheduled_jobs`, and `work_order_statuses`
- `REPLICA IDENTITY FULL` is set on `jobs`, `scheduled_jobs`, and `mechanics` so realtime events carry complete old rows
- The app subscribes to `postgres_changes` scoped by `shop_id` filter — each client only receives events for their active shop
- Subscriptions persist across day navigation; switching shops re-creates them with the new shop's filter

You can verify realtime is enabled in the Supabase dashboard under Database > Replication.

### 5. Test the setup

You can test the setup by:

1. Starting your Next.js application
2. Signing up with a shop name (creates the shop + makes you the owner)
3. Navigating to the calendar page
4. Adding, editing, and scheduling jobs
5. Inviting another user from the Members page and verifying they can see realtime updates

## Database Schema Overview

### Tables

1. **shops** — Store shop information
2. **mechanics** — Store mechanic information (linked to shops)
3. **work_order_statuses** — Global work order status definitions
4. **jobs** — Work orders/jobs (linked to shops)
5. **scheduled_jobs** — Scheduled job assignments (links jobs to mechanics)
6. **user_shop_memberships** — Maps users to shops with roles (owner, manager, mechanic)
7. **invitations** — Token-based invitation system for adding users to shops

### Key Features

- **Row Level Security (RLS)**: Users can only access data from their own shop; role-based policies restrict writes (mechanics read-only, managers + owners can manage jobs, only owners can manage memberships)
- **Multi-user membership**: Multiple users per shop with role-based access control (owner > manager > mechanic)
- **Real-time subscriptions**: Changes are synchronized across all connected clients, scoped by shop
- **Foreign key constraints**: Maintains data integrity
- **Indexes**: Optimized for common queries

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**: Verify the user has a membership row in `user_shop_memberships` for the shop they're trying to access
2. **Real-time not working**: Check that real-time is enabled for the tables in your Supabase dashboard under Database > Replication, and that `REPLICA IDENTITY FULL` is set on `jobs`, `scheduled_jobs`, and `mechanics`
3. **Migration errors**: Ensure your Supabase project is properly linked and you have the correct permissions

### Reset the database

If you need to start over:

```bash
# Reset local database
supabase db reset

# Reset remote database (be careful!)
supabase db reset --linked
```

## Local Development with Docker

The Supabase CLI runs a full local Supabase stack in Docker. This gives you an isolated development database — no risk of affecting production data.

**Prerequisites:** Docker Desktop + Supabase CLI installed.

### Quick start

```bash
# One command to start everything and seed the DB:
./scripts/dev-local.sh

# Or manually:
supabase start          # Start local Supabase in Docker
supabase db reset       # Apply migrations + seed data locally
```

### Configure environment

Use the `switch-env` Claude skill to toggle between local and production:

```bash
# Ask Claude: "switch to local" (or run /switch-env local)
# This creates .env.development.local with local keys automatically.

# To go back: "switch to production" (or /switch-env production)
# This removes .env.development.local so .env.local takes over.
```

**How it works:** `.env.development.local` has the highest priority in Next.js dev mode. It overrides `.env.local`. The skill writes or removes this file. No manual editing needed.

See `.env.example` and `.claude/skills/switch-env/SKILL.md` for details.

### Useful commands

| Command | What it does |
|---|---|
| `supabase start` | Start local Supabase in Docker |
| `supabase stop` | Stop all local Docker containers |
| `supabase status` | Show running services and their URLs |
| `supabase db reset` | Drop DB, re-run migrations, re-seed |
| `npm run dev` | Start the Next.js app |
| `supabase db push` | Push migrations to the linked remote project |

### Local services

| Service | Local URL |
|---|---|
| API (REST + Auth) | `http://127.0.0.1:54321` |
| Studio (dashboard) | `http://127.0.0.1:54323` |
| Inbucket (email capture) | `http://127.0.0.1:54324` |
| Database (direct) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## Switching Between Local and Production

Use the `switch-env` skill — no manual env file editing.

### Switch to local

```
/switch-env local
npm run dev
```

This creates `.env.development.local` with your local Supabase keys (parsed from `supabase status`). Next.js auto-loads it in dev mode with highest priority.

### Switch to production

```
/switch-env production
npm run dev
```

This removes `.env.development.local`. Your `.env.local` (production values) takes over.

### What's happening

Next.js env load order in dev (later overrides earlier):

1. `.env` — committed defaults
2. `.env.development` — dev-only (not used by this project)
3. `.env.local` — **always loaded** (production values live here)  
4. `.env.development.local` — **dev-only, highest priority** (written by skill)

When `.env.development.local` exists → local Supabase. When it doesn't → production Supabase.

## Development

### Adding new migrations

1. Create a new migration file in `supabase/migrations/` with the format: `YYYYMMDDHHMMSS_description.sql`
2. Test locally: `supabase db reset`
3. Deploy to production: `supabase db push`
4. Test thoroughly before deploying to production

## Production Considerations

1. **Backup**: Set up regular backups of your production database
2. **Monitoring**: Monitor database performance and query execution times
3. **Scaling**: Consider read replicas for high-traffic applications
4. **Security**: Regularly review and audit your RLS policies

## Support

If you encounter issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the migration files for syntax errors
3. Check your Supabase project logs
4. Ensure all environment variables are correctly set
