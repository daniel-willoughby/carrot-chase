/**
 * Next.js 16 Proxy (previously known as Middleware).
 *
 * Runs before every matched request. Used here to:
 *   - Refresh the Supabase session cookie if expired
 *   - Redirect unauthenticated users to /login
 *   - Enforce AAL2 (2FA) on every protected route
 */
import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip everything we don't want auth-gated:
    //  - Next internals (_next/*, __nextjs_*, _vercel)
    //  - Public static assets (manifest, service worker, favicon, robots,
    //    sitemap, any image extension)
    //  - The seed CSV
    "/((?!_next/|__nextjs_|_vercel|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|sw\\.js|runners-template\\.csv|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
