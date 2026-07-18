# Next.js Error Handling Rules

These rules apply to all error handling in this Next.js App Router project. Follow them strictly.

## Three error handling patterns — pick the right one

| Pattern | When to use | How it works |
|---|---|---|
| `error.tsx` route file | Server Components that `await` data (Supabase queries, etc.) | Next.js auto-wraps the page in an Error Boundary. When the route throws during rendering, the `error.tsx` UI replaces it. |
| Inline error state (`error ? <p>{error}</p> : <UI/>`) | Client Components that call server actions or Supabase Auth in event handlers | The component catches the error in a try/catch and sets `useState`-based error state. `error.tsx` cannot help here — event handler errors don't bubble to the boundary. |
| `global-error.tsx` | Errors in the root `layout.tsx` itself | Replaces the entire `<html>`/`<body>`. Must provide its own layout shell. |

## `error.tsx` — the key rule

**`error.tsx` only catches rendering errors.** If a page is an `async` Server Component with `await supabase.from(...)` calls and the query throws, `error.tsx` catches it. If a Client Component throws in an event handler (e.g., a form submission), `error.tsx` does NOT catch it — the client must handle that error inline.

```
✅ Server Component throws during render   → error.tsx catches it
❌ Client Component event handler throws   → error.tsx does NOT help
```

## Use the shared ErrorCard component

The project has an `ErrorCard` component at `components/ui/error-card.tsx`. Always use it for error boundaries — never inline error UIs:

```tsx
import { ErrorCard } from "@/components/ui/error-card";

// ✅ Correct
export default function RouteError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorCard error={error} reset={reset} />;
}

// ❌ Wrong — don't inline
export default function RouteError({ error }: { error: Error }) {
  return <div className="p-4 text-red-500">{error.message}</div>;
}
```

**Never render `error.message` directly.** The ErrorCard logs the full error to `console.error` but only shows user-friendly text via `title` and `message` props. Raw Supabase errors, stack traces, and internal details must never appear in the UI.

## Use the shared getErrorMessage utility

The project has `getErrorMessage` at `lib/error-utils.ts`. Always use it instead of writing `err instanceof Error ? err.message : "..."` inline:

```tsx
import { getErrorMessage } from "@/lib/error-utils";

// ✅ Correct
setError(getErrorMessage(err, "Failed to create invitation"));

// ❌ Wrong
setError(err instanceof Error ? err.message : "Failed to create invitation");
```

This handles `Error`, `string`, `null`/`undefined`, Supabase PostgrestError shapes, and objects with a `.message` property. The second argument is the fallback message.

## When creating a new error.tsx

1. **Add it for every async Server Component route** that fetches data (Supabase queries, API calls, etc.)
2. **Match the real page's layout** — same wrapper divs, same max-width, same spacing as the corresponding `loading.tsx` to prevent layout shift
3. **Provide a contextual title** — "Unable to load members" not "Something went wrong" (use the `title` prop on ErrorCard)
4. **Provide a contextual message** — explain what failed in user-friendly terms (use the `message` prop on ErrorCard)
5. **Set homeHref** — link back to the relevant parent route, not always `"/"`
6. **Always mark it `"use client"`** — error boundaries require Client Components

## When NOT to use error.tsx

- **Client Components with their own error handling** — login forms, sign-up forms, onboarding forms, and members forms already use `useState`-based error state in event handlers. `error.tsx` cannot catch event handler errors.
- **Calendar components** — the Calendar (`components/calender/`) manages its own error state with `alert()` and `console.error`. Adding `error.tsx` here would not catch event-handler errors.
- **Static pages** — the landing page (`/`), sign-up success, and auth error pages have no data fetching that could throw.
- **Near-instant server checks** — auth pages that just check `getUser()` and redirect. These don't benefit from a full error boundary.
- **Route handlers** — `error.tsx` does not apply to API routes. Wrap route handler logic in try/catch instead.
- **Server action throws caught by callers** — errors thrown in server actions that are caught by the calling Client Component (e.g., `createInvitation` caught in `members-client.tsx`) do not reach `error.tsx`.

## Existing error handling coverage

| Route | Pattern | File |
|---|---|---|
| `/protected/members` | `error.tsx` | `app/protected/members/error.tsx` |
| `/onboarding` | `error.tsx` | `app/onboarding/error.tsx` |
| `/auth/accept-invitation` | `error.tsx` | `app/auth/accept-invitation/error.tsx` |
| `/protected` (Calendar) | `error.tsx` | `app/protected/error.tsx` |
| `/auth/login` | Inline error state | `components/login-form.tsx` |
| `/auth/sign-up` | Inline error state | `components/sign-up-form.tsx` |
| `/auth/update-password` | Inline error state | `components/update-password-form.tsx` |
| `/auth/forgot-password` | Inline error state | `components/forgot-password-form.tsx` |
| `/auth/confirm` (route handler) | try/catch + redirect | `app/auth/confirm/route.ts` |
| All unmatched routes | `error.tsx` (root fallback) | `app/error.tsx` |
| Root layout crash | `global-error.tsx` | `app/global-error.tsx` |
