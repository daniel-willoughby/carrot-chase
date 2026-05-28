/**
 * Browser-side Supabase client.
 *
 * Use this in Client Components (anything with "use client"). Sessions are
 * stored in HttpOnly cookies managed by the middleware, not localStorage.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
