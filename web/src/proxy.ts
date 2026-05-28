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
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
