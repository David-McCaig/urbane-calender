# Seed Data Rules

How seed data works in this project — local dev vs live Supabase.

## Architecture

Seed data is split across two files with different execution timing:

| File | When it runs | Purpose |
|---|---|---|
| `supabase/migrations/00000000000004_seed.sql` | During migrations (`db reset` & `db push`) | **Reference data only** — work order statuses. No auth dependency. |
| `supabase/seed.sql` | After migrations during `supabase db reset` only | **Full test data** — auth users, shop, mechanics, memberships, jobs. |

`supabase db push` (used for live/production) runs migrations but **not** seed.sql. That's why the migration seed is limited to reference data — everything else depends on auth users that only exist on the live instance.

## UUID scheme

All seed UUIDs use a structured pattern that won't collide with `gen_random_uuid()`:

| Prefix | Entity | Example |
|--------|--------|---------|
| `a...` | Auth users (local only) | `a0000000-0000-4000-8000-000000000001` |
| `b...` | Shops | `b0000000-0000-4000-8000-000000000001` |
| `c...` | Mechanics | `c0000000-0000-4000-8000-000000000001` |
| `d...` | Jobs | `d0000000-0000-4000-8000-000000000001` |
| `550e8400-...` | Work order statuses | `550e8400-e29b-41d4-a716-446655440001` |

For live DB, auth user UUIDs come from Supabase Auth — use the real IDs from the dashboard, not the structured `a...` prefixes.

## Idempotency

Every insert uses `ON CONFLICT ... DO NOTHING`. Every delete targets specific known UUIDs. The seed.sql cleanup section deletes old seed data in reverse dependency order before inserting new data. Safe to run repeatedly.

## How to seed

### Local dev

```bash
supabase db reset
```

This drops the DB, runs all migrations, then runs seed.sql. Docker must be running.

### Live Supabase

Auth users must exist first (created via dashboard or sign-up). Then copy the relevant sections from `supabase/seed.sql` into the SQL Editor:

1. **Work order statuses** (if not already present) — from `migrations/00000000000004_seed.sql`
2. **Shop, mechanics, memberships** — sections 3–5 of `supabase/seed.sql`
3. **Jobs** — section 6 of `supabase/seed.sql`

Never copy auth user INSERTs to live unless you know what you're doing — the live users already exist.

## Adding new seed data

1. Decide: is it reference data (no auth dependency) or test data?
2. Reference data → add to `migrations/00000000000004_seed.sql`
3. Test data → add to `supabase/seed.sql`
4. Pick a UUID from the next available slot in the `d...` / `e...` / etc. range
5. Always use `ON CONFLICT (id) DO NOTHING`
6. If adding dependent data, add cleanup DELETEs for old UUIDs at the top of `seed.sql`
7. Re-run `supabase db reset` to verify locally

## Current seed data

| Shop | Owner | Mechanics | Jobs |
|------|-------|-----------|------|
| test (`b0000000-...`) | davidmccaig1@gmail.com | Alex Johnson (Mechanic), Sam Rivera (Mechanic), Jordan Lee (Service Writer) | WO-100–WO-105 (bicycle repair) |
