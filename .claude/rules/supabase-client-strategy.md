# Supabase Client Strategy

This project uses a four-tier Supabase client architecture. Each client has a specific purpose and strict boundaries. Importing the wrong client causes auth breakage or security issues.

## The Four Clients

| Client | File | Key | RLS | Allowed contexts |
|---|---|---|---|---|
| Browser | `@/lib/supabase/client` | Anon (public) | Enforced | `'use client'` components, hooks, Context |
| Server | `@/lib/supabase/server` | Anon (public) | Enforced | Server Components, Server Actions, Route Handlers |
| Middleware | `@/lib/supabase/middleware` | Anon (public) | Enforced | Next.js middleware only |
| Service | `@/lib/supabase/service` | Service-role | Bypassed | Server-side only, bootstrap operations |

## Decision tree — which client to use

```
Am I in middleware.ts?
  YES → use @/lib/supabase/middleware (reads NextRequest cookies)
  NO  → Am I in a 'use client' file?
           YES → use @/lib/supabase/client (createBrowserClient)
           NO  → Am I in a Server Component, Server Action, or Route Handler?
                   YES → Do I need to bypass RLS?
                           YES → use @/lib/supabase/service
                           NO  → use @/lib/supabase/server
```

## Critical: Never import service client in browser code

```typescript
// WRONG — exposes SUPABASE_SERVICE_ROLE_KEY to the browser
// In any 'use client' file:
import { createServiceClient } from '@/lib/supabase/service';

// CORRECT — service client is server-only
// In a Server Action ('use server' file):
import { createServiceClient } from '@/lib/supabase/service';
```

The service client uses `SUPABASE_SERVICE_ROLE_KEY` which must never reach the browser. If you need a privileged operation from client code, create a Server Action in `lib/actions/` that uses the service client server-side.

## Always create fresh clients — no module-level caching

```typescript
// WRONG — cached in module scope, sessions bleed between requests
const supabase = createClient();
export async function getData() {
  return supabase.from('jobs').select('*');
}

// CORRECT — fresh client per invocation
export async function getData() {
  const supabase = createClient();
  return supabase.from('jobs').select('*');
}
```

Module-level clients cause session cross-contamination on Fluid compute. Both `server.ts` and `middleware.ts` have inline comments warning about this.

## Client-specific patterns

### Server client (`server.ts`)

The `createClient` in `server.ts` is `async` because it calls `await cookies()`. Always `await` it:
```typescript
const supabase = await createClient();
```

The `setAll` try/catch in `server.ts` is intentional — Server Components cannot set cookies, so the catch silently ignores the error. Do not "fix" this by adding a throw or log. Middleware handles session refresh for Server Components.

### Middleware client

Use `getClaims()` not `getUser()`:
```typescript
// CORRECT — reads JWT claims directly, no API call
const { data } = await supabase.auth.getClaims();
const user = data?.claims;

// WRONG — makes a round-trip to Supabase Auth on every request
const { data: { user } } = await supabase.auth.getUser();
```

`getClaims()` reads the user identity from the JWT cookie directly. `getUser()` makes an HTTP request to Supabase Auth. In middleware, which runs on every navigation, this matters.

Always return the `supabaseResponse` object from middleware — it carries refreshed auth cookies. If you create a new `NextResponse`, copy the cookies:
```typescript
const myResponse = NextResponse.next({ request });
myResponse.cookies.setAll(supabaseResponse.cookies.getAll());
return myResponse;
```

### Service client (`service.ts`) — only for bootstrap operations

The service client bypasses RLS. It exists for exactly two scenarios (see `multi-tenant-auth.md`):

1. Creating the first shop for a new user (they have no membership yet)
2. Accepting invitations (the invitee is not yet a member)

All subsequent CRUD for established members must use the anon-key server client and rely on RLS.
