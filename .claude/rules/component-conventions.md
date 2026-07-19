# Component Conventions

Component architecture rules for this Next.js App Router project. Follow these strictly.

## Server by default

Every new component starts as a Server Component. Only add `'use client'` when the component needs:

- Event handlers (`onClick`, `onSubmit`, etc.)
- React hooks (`useState`, `useEffect`, `useRef`, `useContext`, etc.)
- Browser APIs (`window`, `document`, `localStorage`, etc.)
- Third-party client libraries (dnd-kit, Radix interactive primitives)

```typescript
// Start here — Server Component (no directive needed)
export function JobCard({ job }: { job: Job }) {
  return <div>{job.workorder_id}</div>;
}

// Only add 'use client' when interactivity is required
'use client';
export function JobCard({ job, onDelete }: { job: Job; onDelete: () => void }) {
  return <div onClick={onDelete}>{job.workorder_id}</div>;
}
```

## Client extraction pattern

When a server page needs interactivity, extract the interactive parts into a separate Client Component:

```typescript
// app/protected/page.tsx — Server Component
// Fetches data, handles auth, renders client child
export default async function ProtectedPage() {
  const shopId = await resolveActiveShop();
  if (!shopId) redirect('/onboarding');
  return <Calendar />; // Client Component child
}
```

The pattern is:
1. **Server page** — owns data fetching, auth checks, redirects
2. **Client child** — owns interactivity, real-time state, event handlers

Never add `'use client'` to a page file just to use a hook. Extract the hook usage into a client child.

Existing examples:
- `app/onboarding/page.tsx` → `<OnboardingClient userEmail={...} />`
- `app/protected/page.tsx` → `<Calendar />`
- `app/protected/members/page.tsx` → `<MembersClient members={...} />`

## No barrel exports

Import directly from the source file:

```typescript
// CORRECT
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useActiveShop } from '@/lib/context/shop-context';

// WRONG — barrel files don't exist in this project
import { Button, Card } from '@/components/ui';
```

Barrel files (`index.ts`) create circular dependency risks, slow down Fast Refresh, and hide the actual import source. This project does not use them — keep it that way.

## `@/` path alias for all imports

All imports use the `@/` alias (configured in `tsconfig.json` as `@/*` → `./*`):

```typescript
// CORRECT
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { Job } from '@/lib/database/calendar';

// WRONG — relative imports
import { createClient } from '../../../lib/supabase/server';
```

The only exception is same-directory imports within a feature (e.g., `./calendar-grid` within `components/calender/`).

## shadcn/ui conventions

### Use `cn()` for class merging

```typescript
import { cn } from '@/lib/utils';

// CORRECT — cn() handles conflicts via tailwind-merge
<button className={cn('px-4 py-2', variant === 'primary' && 'bg-blue-500')} />

// WRONG — string interpolation doesn't resolve Tailwind conflicts
<button className={`px-4 py-2 ${variant === 'primary' ? 'bg-blue-500' : ''}`} />
```

### Use CVA for component variants

For components with multiple variants and sizes, use `class-variance-authority`:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('inline-flex items-center justify-center', {
  variants: {
    variant: { default: 'bg-primary', destructive: 'bg-destructive', outline: 'border' },
    size: { default: 'h-10 px-4', sm: 'h-9 px-3', lg: 'h-11 px-8' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
```

See `components/ui/button.tsx`, `components/ui/badge.tsx` for examples.

### Use compound components for complex UIs

```typescript
// CORRECT — Card exports CardHeader, CardTitle, CardContent, CardFooter
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>

// WRONG — don't inline card-like layouts with raw divs
<div className="rounded-xl border"><div className="p-6">...</div></div>
```

### Use `forwardRef` for leaf components that accept refs

```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => { ... }
);
Button.displayName = 'Button';
```

### Adding new shadcn components

Use the CLI: `npx shadcn@latest add <component>`. This preserves the project's configuration (new-york style, neutral base, CSS variables). Don't copy-paste from the shadcn website — the styling won't match.

## Named exports preferred

```typescript
// CORRECT — named export
export function CalendarGrid({ ... }) { ... }

// Acceptable — default export for Next.js page components (required by App Router)
export default function ProtectedPage() { ... }

// Acceptable — default export for the Calendar wrapper
export default function Calendar() { ... }
```

Default exports are used sparingly — only where Next.js requires them (page/route files) or for the top-level feature wrapper. Everywhere else, use named exports.

## Client Component boundary hygiene

- Put `'use client'` on line 1 of the file — never in the middle
- One `'use client'` per file is enough — a file imported by a client component doesn't need its own directive
- Prefer extracting a small client leaf rather than marking a large component tree as client
- Server Components can render Client Components as children — use this to keep data fetching server-side

## Cross-references

- [Next.js error handling](nextjs-error-handling.md) — error.tsx for Server Components, inline errors for Client Components
- [Next.js loading](nextjs-loading.md) — loading.tsx for Server Components, inline spinners for Client Components
- [Real-time subscriptions](real-time-subscriptions.md) — subscriptions live in Client Component hooks
