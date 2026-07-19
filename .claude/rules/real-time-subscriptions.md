# Real-Time Subscriptions

The calendar feature uses Supabase Realtime (Postgres Changes) for live updates. Follow these patterns when adding new subscriptions.

## Prerequisites: `REPLICA IDENTITY FULL`

Any table used with Postgres Changes must have `REPLICA IDENTITY FULL`:

```sql
ALTER TABLE your_table REPLICA IDENTITY FULL;
```

Without this, `UPDATE` and `DELETE` events only include the primary key — all other columns are NULL in the old record payload. The schema migration sets this for `jobs`, `scheduled_jobs`, and `mechanics` (lines 211-213 of `00000000000001_schema.sql`).

Add the table to the realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE your_table;
```

## Channel naming — include the shop ID

```typescript
// CORRECT — shop ID suffix prevents cross-shop data leaks
supabase.channel(`jobs_changes_${shopId}`)

// WRONG — without shop ID, all shops share the same channel
supabase.channel('jobs_changes')
```

Supabase realtime channels are global. Without a shop ID in the channel name, a client could receive events from another shop. The filter (`shop_id=eq.${shopId}`) still applies server-side, but the naming convention is defense-in-depth.

Current channels (from `lib/database/calendar.ts`):
- `jobs_changes_${shopId}`
- `scheduled_jobs_changes_${shopId}`
- `mechanics_changes_${shopId}`

## Re-fetch on change, never apply deltas

```typescript
// CORRECT — re-fetch the entire dataset on any change
subscribeToJobs(activeShop.id, (payload) => {
  getJobs().then(setJobs).catch(console.error);
});

// WRONG — trying to apply the payload as a delta update
subscribeToJobs(activeShop.id, (payload) => {
  if (payload.eventType === 'INSERT') {
    setJobs(prev => [...prev, payload.new]);
  } // misses UPDATEs that change sort order, DELETEs with cascading effects, etc.
});
```

Re-fetching is simpler and avoids consistency issues: what if an UPDATE changes the `created_at` sort order? What if a DELETE cascades? Always re-fetch.

## `currentDateRef` pattern for closure safety

The `use-calendar-data.ts` hook uses a ref to keep the subscription callback's date current without resubscribing:

```typescript
// Keep a ref so subscription callbacks always read the latest date
const currentDateRef = useRef(currentDate);
currentDateRef.current = currentDate;

// Subscription effect — depends on activeShop only, NOT currentDate
useEffect(() => {
  if (!activeShop) return;
  const sub = subscribeToScheduledJobs(activeShop.id, (payload) => {
    // Reads the latest date from the ref, not a stale closure value
    getScheduledJobs(formatLocalDate(currentDateRef.current))
      .then(setScheduledJobs).catch(console.error);
  });
  return () => { sub.unsubscribe(); };
}, [activeShop]); // Note: currentDate is NOT in the dependency array
```

**Why**: If `currentDate` were in the dependency array, the subscription would be torn down and re-created every time the user navigates to a different day. With the ref, the same subscription persists across date changes, and the callback always reads the latest date.

**Rule**: When a subscription callback needs a value that changes frequently (date, filter, sort order), use a ref. Put only stable dependencies (like `activeShop`) in the effect's dependency array.

## Subscription lifecycle

Always clean up subscriptions:

```typescript
useEffect(() => {
  if (!activeShop) return;
  const subscription = subscribeToJobs(activeShop.id, callback);
  return () => {
    subscription.unsubscribe();
  };
}, [activeShop]);
```

Never subscribe outside a `useEffect` with a cleanup return. Orphaned subscriptions continue receiving events after the component unmounts, causing state updates on unmounted components.

## Optimistic updates + real-time reconciliation

The calendar uses this pattern for drag-and-drop scheduling:

1. **Optimistic update** — immediately update local state (e.g., move the job in the grid)
2. **Server call** — `createScheduledJob()` or `updateScheduledJob()` in the background
3. **Real-time reconciliation** — the subscription fires, re-fetches from the server, and replaces the optimistic state with the authoritative server state

On error, fall back to a full re-fetch:
```typescript
try {
  await createScheduledJob(data);
  // Real-time subscription will reconcile (replaces placeholder ID with real one)
} catch (error) {
  console.error('Error scheduling job:', error);
  // Re-fetch to reconcile state
  getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
  alert('Failed to schedule job. Please try again.');
}
```

Never try to undo the optimistic update manually — it's error-prone and can conflict with real-time updates from other users.

## When NOT to use real-time

Not every table needs real-time. Skip it for:

- **Reference data** — work order statuses don't change during a session
- **Auth data** — memberships, invitations change rarely and are managed via server actions with `revalidatePath()`
- **Slow-changing config** — shop settings, mechanic lists that only change via admin actions

If data is only mutated through server actions and the page re-renders after the action, real-time is unnecessary overhead.

## Cross-references

- [Mutation strategy](mutation-strategy.md) — how client-side DB calls pair with real-time subscriptions
- [Component conventions](component-conventions.md) — subscriptions belong in Client Components/hooks
