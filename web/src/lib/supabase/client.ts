/**
 * Browser-side Supabase client.
 *
 * Use this in Client Components (anything with "use client").
 *
 * Session storage: @supabase/ssr keeps the auth tokens in cookies (NOT
 * localStorage), and this browser client reads them via document.cookie — so
 * the cookies are deliberately NOT HttpOnly (they couldn't be, or the client
 * couldn't read them). That means an XSS could read the session, which is why
 * the strict nonce-based Content-Security-Policy in the proxy is load-bearing,
 * not decorative. Treat any script-injection bug as session-takeover severity.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
