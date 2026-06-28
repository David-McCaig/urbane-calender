# Migration Rules

These rules apply to all SQL migration files. Follow them strictly.

## Idempotency — every migration must be re-runnable

A migration that fails on a second run creates a mess. Guard everything:

| Object type | Safe pattern |
|---|---|
| Tables | `CREATE TABLE IF NOT EXISTS` |
| Indexes | `CREATE INDEX IF NOT EXISTS` |
| Functions | `CREATE OR REPLACE FUNCTION` |
| Triggers | `DROP TRIGGER IF EXISTS ... ON ...;` then `CREATE TRIGGER ...` |
| Policies | `DROP POLICY IF EXISTS "name" ON ...;` then `CREATE POLICY "name" ...` |
| Enums | Wrap in `DO $$ BEGIN CREATE TYPE ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;` |
| Publication adds | Wrap in `DO $$ BEGIN ALTER PUBLICATION ... ADD TABLE ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;` |
| Seed inserts | `INSERT ... ON CONFLICT (id) DO NOTHING;` |

## Structure

- **One logical unit per file** — don't mix schema changes with seed data or grants
- **Order**: schema (tables/types/functions) → RLS policies → grants → seeds
- **Naming**: `YYYYMMDDHHMMSS_description.sql` — use the current timestamp

## No fix migrations

Get it right the first time. Don't create a migration that later gets undone by another migration. If you find yourself writing `DROP ...` to undo something from an earlier migration, squash instead.

## RLS policies

- Every table must have RLS enabled and at minimum a SELECT policy.
- Prefer `SECURITY DEFINER` helper functions over self-referencing subqueries in `USING` clauses. Self-referencing subqueries cause infinite RLS recursion.
- Test policies from the perspective of every role (owner, manager, mechanic, unauthenticated).

## Grants

- Always grant on new tables to both `authenticated` and `service_role`.
- Set `ALTER DEFAULT PRIVILEGES` so future tables inherit grants automatically.
- Grant `USAGE` on new types to `authenticated`.
