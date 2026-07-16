---
name: seed-data
description: Seed the database with test data (shop, mechanics, jobs). Works for both local Supabase and live.
---

# Seed Database

Use this skill when the user wants to seed, reset, or update the local or live database with test data.

## Local dev

To reset the local database and apply all seed data:

```bash
supabase db reset
```

Docker must be running. This drops the DB, runs all migrations, then runs `supabase/seed.sql`.

If the storage container is unhealthy and `db reset` fails, apply seed.sql directly:

```bash
docker exec -i supabase_db_urbane-calender psql -U postgres < supabase/seed.sql
```

## Live Supabase

### Step 1: Verify work order statuses exist

Run in the SQL Editor:
```sql
SELECT * FROM work_order_statuses;
```

If empty, run the contents of `supabase/migrations/00000000000004_seed.sql`.

### Step 2: Verify the shop, mechanics, and memberships exist

Run in the SQL Editor:
```sql
SELECT id, name FROM shops;
SELECT m.name, u.email FROM mechanics m JOIN auth.users u ON u.id = m.user_id;
SELECT u.email, usm.role FROM user_shop_memberships usm JOIN auth.users u ON u.id = usm.user_id;
```

If any are missing, run the relevant sections from `supabase/seed.sql`.

### Step 3: Seed jobs

Run in the SQL Editor:
```sql
SELECT workorder_id, hook_in FROM jobs ORDER BY workorder_id;
```

If empty (or you want to add more), copy section 6 from `supabase/seed.sql`.

## Key files

- `supabase/migrations/00000000000004_seed.sql` — work order statuses (reference data)
- `supabase/seed.sql` — complete test data (auth users, shop, mechanics, memberships, jobs)
- `.claude/rules/seeding.md` — full documentation of the seed data architecture

## UUID scheme

| Prefix | Entity |
|--------|--------|
| `a...` | Auth users (local only) |
| `b...` | Shops |
| `c...` | Mechanics |
| `d...` | Jobs |
| `550e8400-...` | Work order statuses |

For live DB, auth user UUIDs come from the Supabase dashboard (Authentication → Users).
