# Multi-Tenant Auth & Shop Isolation

This project is multi-tenant: each shop's data must be isolated from every other shop. The isolation is enforced at the database level through RLS policies driven by the user's JWT. Breaking any link in this chain causes data leakage between shops.

## How shop isolation works — end-to-end

```
1. active_shop_id stored in Supabase Auth user_metadata
   ↓
2. Encoded in the user's JWT (access token)
   ↓
3. PostgreSQL reads it via auth.jwt() → get_user_shop_id()
   ↓
4. Every RLS policy filters by shop_id = get_user_shop_id()
   ↓
5. User only sees data from their active shop
```

## The PG helper functions

Two `SECURITY DEFINER` functions in `supabase/migrations/00000000000001_schema.sql` power all RLS checks:

### `get_user_shop_id()` — returns the active shop UUID

Priority order (lines 151-186 of the schema migration):

1. `user_metadata.active_shop_id` — set explicitly by the app on sign-up, onboarding, and shop switching
2. `user_metadata.shop_id` — legacy fallback
3. `app_metadata.shop_id` — legacy fallback
4. First membership row (ordered by `created_at`) — database fallback for users who somehow lack metadata

This function is `SECURITY DEFINER` so it can read `auth.jwt()` regardless of the caller's permissions.

### `get_user_shop_role()` — returns the user's role in the active shop

Reads `user_shop_memberships.role` for the current user + active shop combination. Used in RLS policies that restrict writes to owners/managers.

## The JS counterpart: `resolveActiveShop()`

`lib/actions/membership.ts` (lines 44-69) mirrors the same logic in TypeScript:

```typescript
export async function resolveActiveShop(): Promise<string | null> {
  const { supabase, user } = await getCurrentUser();
  // 1. Try user_metadata.active_shop_id first
  let shopId = user.user_metadata?.active_shop_id;
  if (!shopId) {
    // 2. Fall back to first membership
    const { data: memberships } = await supabase
      .from('user_shop_memberships')
      .select('shop_id').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1);
    if (memberships && memberships.length > 0) {
      shopId = memberships[0].shop_id;
      // 3. Persist to metadata so subsequent requests are fast
      await supabase.auth.updateUser({ data: { active_shop_id: shopId } });
    }
  }
  return shopId ?? null;
}
```

This is called by every server page (`protected/page.tsx`, `onboarding/page.tsx`, `protected/members/page.tsx`) to determine which shop to render.

## Rule: Every new table must have `shop_id` and filter by `get_user_shop_id()`

When adding a new table that contains shop-scoped data:

```sql
-- 1. Include a shop_id column
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  -- ... other columns
);

-- 2. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy filters by active shop
CREATE POLICY "Users can view their shop's data" ON new_table
  FOR SELECT USING (shop_id = get_user_shop_id());

-- 4. INSERT policy checks shop matches
CREATE POLICY "Users can insert for their shop" ON new_table
  FOR INSERT WITH CHECK (shop_id = get_user_shop_id());

-- 5. Add to the realtime publication if needed
ALTER PUBLICATION supabase_realtime ADD TABLE new_table;
```

See [`migrations.md`](migrations.md) for idempotency patterns (DROP IF EXISTS, etc.).

## Service client usage in multi-tenant context

The service client bypasses RLS entirely. It must only be used when there is no other way. The only valid scenarios:

| Scenario | Server Action | Why RLS can't work |
|---|---|---|
| Creating first shop | `createShopAndMembership()` | User has no membership, and shop INSERT is gated behind membership |
| Accepting invitation | `acceptInvitation()` | User is not a member yet, can't query `invitations` via RLS |

All other operations use the anon-key server client and rely on RLS. If you find yourself reaching for the service client for routine CRUD, the RLS policy needs fixing, not the client choice.

## `switchActiveShop()` flow

From `lib/actions/membership.ts` (lines 142-167):

1. Verify the user has a membership for the target shop (server client, RLS enforced)
2. Update `user_metadata.active_shop_id` via `supabase.auth.updateUser()`
3. Call `revalidatePath('/', 'layout')` — this clears the Next.js cache so server pages re-render with the new shop context

The client-side `ShopProvider.switchShop()` (in `lib/context/shop-context.tsx`) calls both:
- `switchActiveShop(shopId)` — the server action above
- `router.refresh()` — refreshes client-side React state
- `loadData()` — re-fetches memberships from the browser client

Both `revalidatePath()` and `router.refresh()` are needed because:
- `revalidatePath()` updates the **server** cache (next request gets fresh data)
- `router.refresh()` updates the **client** React tree (current page re-renders)

## Active shop in user_metadata vs database

The active shop ID lives in `auth.users.user_metadata` — not in a database table. This is deliberate:

- **JWT accessibility**: RLS policies can read `auth.jwt()` without a database query
- **Performance**: `get_user_shop_id()` reads from the JWT directly (sub-millisecond), falling back to a DB query only if metadata is missing
- **Consistency**: The same value powers both RLS (via JWT) and the app (via `resolveActiveShop()`)

When setting the active shop, always update both:
1. `supabase.auth.updateUser({ data: { active_shop_id: shopId } })` — updates the JWT
2. `revalidatePath('/', 'layout')` — updates the server cache

## Role checks

The `get_user_shop_role()` PG function is used in RLS policies to gate write operations:

- **Owner only**: UPDATE/DELETE on `shops`, `user_shop_memberships`, `invitations`
- **Owner/Manager**: INSERT/UPDATE/DELETE on `mechanics`, UPDATE/DELETE on `jobs`
- **Any member**: SELECT on all tables, INSERT on `jobs`, `scheduled_jobs`

The JS equivalent is `getCurrentUserRole()` in `lib/actions/membership.ts`. Use it for UI-level role gating (showing/hiding admin buttons).

## Cross-references

- [Supabase client strategy](supabase-client-strategy.md) — which client to use, service client rules
- [Migrations](migrations.md) — RLS policy idempotency patterns
- [Mutation strategy](mutation-strategy.md) — server actions vs client-side DB calls
