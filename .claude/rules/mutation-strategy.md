# Mutation Strategy

This project has two distinct patterns for database mutations. Choosing the wrong one can bypass RLS, cause stale data, or break real-time sync.

## The Two Patterns

| Criterion | Server Actions | Client-Side DB Functions |
|---|---|---|
| Location | `lib/actions/` | `lib/database/` |
| Directive | `'use server'` | None (client-side) |
| Supabase client | `server.ts` (anon) or `service.ts` (bypass) | `client.ts` (browser, anon) |
| RLS | Enforced (or bypassed via service client) | Always enforced |
| Cache invalidation | `revalidatePath()` | N/A (real-time handles it) |
| Real-time sync | Not needed (server-rendered) | Required (optimistic + reconcile) |
| Error handling | `error.tsx` boundary or caller try/catch | Inline error state or console.error |
| Used for | Memberships, roles, invitations, shops | Jobs, scheduled_jobs, mechanics |

## Decision guide

### Use a Server Action when:

- **Auth-critical data** — memberships, roles, invitations, shop creation. These control who can access what. Mutations must go through the server.
- **The data doesn't need real-time sync** — membership changes affect auth, not live collaboration. `revalidatePath()` is sufficient.
- **RLS must be bypassed** — bootstrap operations (first shop, invitation acceptance) where the user has no membership yet. Only the service client can do this, and it's only available server-side.
- **The calling component doesn't own its data** — if a component displays data fetched by a parent server component, mutations should be server actions so the parent re-renders with fresh data.

Example: `lib/actions/membership.ts` — all `'use server'`, uses `revalidatePath()`, imports both server and service clients.

### Use a Client-Side DB function when:

- **Real-time collaborative data** — jobs, scheduled jobs, mechanics. Multiple users may be viewing and modifying this data simultaneously.
- **Optimistic updates are needed** — the UI should update immediately (e.g., drag-and-drop scheduling) while the server call happens in the background.
- **The data is consumed by a custom hook** — the `useCalendarData` hook manages its own state and subscriptions. Direct client-side calls fit this pattern.
- **Real-time subscriptions reconcile state** — the subscription re-fetches on any change, so stale data is self-correcting.

Example: `lib/database/calendar.ts` — no `'use server'`, uses browser client, consumed by `use-calendar-data.ts`.

## Rule: Never mutate auth/membership tables from the browser client

```
✅ Server Action mutating memberships   → RLS enforced + revalidatePath
❌ Browser client mutating memberships  → bypasses the server, no revalidation
```

Tables that must only be mutated via server actions:
- `user_shop_memberships`
- `invitations`
- `shops`

These control authorization. Mutating them from the browser client is prohibited.

Tables that are safe for client-side mutations (RLS still applies):
- `jobs`
- `scheduled_jobs`
- `mechanics`

## Rule: Service client only for bootstrap, not routine CRUD

The service client (`@/lib/supabase/service`) exists for exactly two scenarios (see [`multi-tenant-auth.md`](multi-tenant-auth.md)):

1. **Creating the first shop** (`createShopAndMembership`) — new user has no membership, RLS blocks the INSERT
2. **Accepting invitations** (`acceptInvitation`) — invitee is not yet a member, RLS blocks the SELECT

Once a user is a member of a shop, all subsequent CRUD for that shop must use the anon-key server client. Never reach for the service client just to avoid writing an RLS policy.

## Error handling per pattern

**Server Actions** — throw errors that the caller catches:
```typescript
// In the action:
if (memberError) throw new Error('Failed to create member');

// In the client component:
try {
  await createInvitation(email, role);
} catch (err) {
  setError(getErrorMessage(err, 'Failed to create invitation'));
}
```

**Client-Side DB functions** — throw errors caught by the hook/component:
```typescript
// In lib/database/calendar.ts:
if (error) { console.error('Error creating job:', error); throw error; }

// In use-calendar-data.ts:
try { await createJob(jobWithShop); } catch (error) {
  console.error('Error adding job:', error);
  alert('Failed to add job. Please try again.');
}
```

## Cross-references

- [Supabase client strategy](supabase-client-strategy.md) — which client to use in each pattern
- [Multi-tenant auth](multi-tenant-auth.md) — service client bootstrap rules in detail
- [Real-time subscriptions](real-time-subscriptions.md) — how client-side mutations reconcile with real-time
- [Next.js error handling](nextjs-error-handling.md) — error boundary vs inline error patterns
