/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * Use ONLY in trusted server-side contexts (Server Actions, Edge Functions,
 * Route Handlers). NEVER import this from a Client Component or expose any
 * function that uses it without strict input validation.
 *
 * Typical uses:
 *   - Invitation acceptance (set role on a brand-new profile)
 *   - CSV bulk imports
 *   - Background jobs (e.g. weekly summary emails)
 *   - Carrot Algorithm batch recalculations
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin operations.",
    );
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
