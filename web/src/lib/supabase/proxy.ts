/**
 * Middleware Supabase client.
 *
 * Runs on every request to refresh expired sessions and apply route guards.
 * This is where the AAL2 (2FA) enforcement lives for protected routes.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Paths that do not require an authenticated session.
const PUBLIC_PATHS = ["/login", "/auth", "/invite", "/_next", "/favicon.ico"];

// Paths that require a fully verified (AAL2 / 2FA-passed) session.
// At MVP this is "everything except the public paths and the 2FA challenge page itself".
const AAL2_EXEMPT = ["/login", "/auth", "/invite", "/two-factor"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the access token if it has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Not logged in and trying to access a protected route -> bounce to /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Logged in but hasn't completed 2FA, trying to access anything other than
  // the 2FA challenge or login flow -> bounce to /two-factor
  if (user && !AAL2_EXEMPT.some((p) => path.startsWith(p))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/two-factor";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
