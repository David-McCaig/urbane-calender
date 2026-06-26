import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS.
 * SERVER-SIDE ONLY. Never import this in client components.
 *
 * Used for server actions that need to perform DB operations
 * that are blocked by RLS for new users (e.g., creating their
 * first shop). Auth validation is done separately via getCurrentUser().
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
