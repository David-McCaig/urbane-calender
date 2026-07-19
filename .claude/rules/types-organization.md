# TypeScript Types Organization

How types are organized in this project. Manual types, no code generation.

## Two-tier type location

| Location | What goes there | Example |
|---|---|---|
| `lib/types/` | Shared types imported across modules | `MembershipRole`, `Shop`, `Invitation`, `MemberRow` |
| Co-located in `lib/database/` | Domain-specific types used within one feature | `Job`, `Mechanic`, `ScheduledJob` |

### `lib/types/membership.ts` — shared domain types

Types that are imported by server actions, the shop context, and multiple pages:
- `MembershipRole` — union type (`'owner' | 'manager' | 'mechanic'`)
- `UserShopMembership` — membership row with optional joined `shop` sub-object
- `Invitation`, `Shop`, `MemberRow` — UI-focused display types

### `lib/database/calendar.ts` — co-located calendar types

Types used only by the calendar feature (`use-calendar-data.ts` and related components):
- `Job`, `Mechanic`, `ScheduledJob`, `WorkOrderStatus`

These are defined at the top of the file that provides their CRUD functions. They're not in `lib/types/` because nothing outside the calendar feature imports them.

## When to split into `lib/types/`

If a type is imported across multiple modules **or** used in both server and client code, it belongs in `lib/types/`. If a type is only used within a single feature module, co-locate it with that module's functions.

```typescript
// ✅ Move to lib/types/ — used by actions, context, AND pages
import type { MembershipRole } from '@/lib/types/membership';

// ✅ Co-locate — only used within the calendar feature
import type { Job } from '@/lib/database/calendar';
```

## Manual types — no `supabase gen types`

Types are hand-written, not generated from the database schema. There is no `database.types.ts` file. This is intentional — the generated types from `supabase gen types` include every column from every table, which is noisy for a small project. Manual types are more focused.

The trade-off: manual types can drift from the actual schema. When you add a column to a table, update the corresponding TypeScript interface. When a Supabase query response doesn't perfectly match the type, `as` casts are used:

```typescript
return data as Invitation[];
return data as UserShopMembership[];
```

These casts are intentional — they assert that the query shape matches the type. Don't "fix" them by removing the cast without ensuring the type matches.

## Joined query type structure

When a Supabase query includes a join, the TypeScript type must include a nested sub-object:

```typescript
// Supabase query:
.select('*, shop:shops(*)')  // joins shops table as 'shop'

// Matching TypeScript:
interface UserShopMembership {
  id: string;
  shop_id: string;
  // ...
  shop?: {           // ← matches the join alias
    id: string;
    name: string;
  };
}
```

The property name (`shop`) must match the join alias (`shop:shops(*)`). The sub-type only needs the columns that are actually selected — not every column from the joined table.

Another example from `lib/database/calendar.ts`:
```typescript
// Query: .select('*, job:jobs(*), mechanic:mechanics(*)')
// Type: ScheduledJob has { job: Job; mechanic: Mechanic }
```

## Union types for enums

Use TypeScript union types, not `enum`:

```typescript
// CORRECT
export type MembershipRole = 'owner' | 'manager' | 'mechanic';

// WRONG — don't use TypeScript enums
export enum MembershipRole { Owner = 'owner', Manager = 'manager', Mechanic = 'mechanic' }
```

Union types are simpler, work better with Supabase query results (which return strings), and don't generate extra JavaScript.

## Cross-references

- [Migrations](migrations.md) — schema changes that require type updates
