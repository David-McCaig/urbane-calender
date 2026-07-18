# Next.js Loading Rules

These rules apply to all loading states in this Next.js App Router project. Follow them strictly.

## Three loading patterns — pick the right one

| Pattern | When to use | How it works |
|---|---|---|
| `loading.tsx` route file | Server Components that `await` data (Supabase queries, etc.) | Next.js auto-wraps the page in Suspense. The loading UI streams in instantly while the page resolves. |
| Inline spinner (`loading ? <Spinner/> : <UI/>`) | Client Components that fetch data in `useEffect` | The component renders, then sets `loading` state. `loading.tsx` cannot help here — the page is already rendered. |
| `<Suspense fallback={...}>` | Client Components that use `useSearchParams()` | Required by Next.js for components reading search params. Prevents de-optimizing the entire page to client-side render. |

## `loading.tsx` — the key rule

**`loading.tsx` only works when data fetching is server-side.** If a page is an `async` Server Component with `await supabase.from(...)` calls, the loading.tsx will show while those queries run. If the page renders a Client Component wrapper (even if that client component fetches its own data), `loading.tsx` will flash for milliseconds — if at all.

```
✅ Server Component fetching data   → loading.tsx works
❌ Client Component with useEffect  → loading.tsx does NOT help
```

## Use the shared Skeleton component

The project has a `Skeleton` component at `components/ui/skeleton.tsx`. Always use it for skeleton placeholders — never inline `animate-pulse` divs:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// ✅ Correct
<Skeleton className="h-8 w-40" />

// ❌ Wrong — don't inline
<div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
```

The only exception: standalone spinners that don't use the pulse animation (e.g., the Calendar's `animate-spin` spinner in `protected/loading.tsx` and `Calendar.tsx`).

## When creating a new loading.tsx

1. **Match the real page's layout exactly** — same wrapper divs, same max-width, same spacing (`space-y-6`, `p-4 md:p-6`, etc.)
2. **Match column widths** for tables — use the same `w-[120px]` etc. as the real page to prevent layout shift
3. **Use the existing UI primitives** — wrap skeletons in `<Card>`, `<CardHeader>`, `<CardContent>` from `components/ui/card` to match the real page structure
4. **Show enough rows to look intentional** — 5 skeleton rows for a table, 2 for a list
5. **Skeleton height should approximate content** — `h-8` for headings, `h-4` for body text, `h-10` for inputs/buttons, `h-16` for tall buttons, `rounded-full` for avatars and badges

## When NOT to use loading.tsx

- **Client Components with their own loading state** — the Calendar (`components/calender/Calendar.tsx`) manages its own spinner because it needs real-time subscriptions. Adding `loading.tsx` here would cause a double-spinner flash.
- **Static pages** — the landing page (`/`), sign-up success, and error pages have no async data fetching.
- **Near-instant server checks** — auth pages that just check `getUser()` and redirect. Use `<Suspense fallback={<FormSkeleton />}>` instead if the form uses `useSearchParams()`.

## Existing loading coverage

| Route | Pattern | File |
|---|---|---|
| `/protected/members` | `loading.tsx` | `app/protected/members/loading.tsx` |
| `/onboarding` | `loading.tsx` | `app/onboarding/loading.tsx` |
| `/auth/accept-invitation` | `loading.tsx` | `app/auth/accept-invitation/loading.tsx` |
| `/protected` (Calendar) | Inline spinner | `app/protected/loading.tsx` + `Calendar.tsx` |
| `/auth/login` | Suspense fallback | `app/auth/login/page.tsx` |
| `/auth/sign-up` | Suspense fallback | `app/auth/sign-up/page.tsx` |
