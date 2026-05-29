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
    return rscAwareRedirect(request, url);
  }

  // Logged in but hasn't completed 2FA, trying to access anything other than
  // the 2FA challenge or login flow -> bounce to /two-factor.
  // Demo accounts (@demo.carrotchase.com) bypass AAL2 enforcement so you can
  // walk every role end-to-end without setting up TOTP per user.
  const isDemoUser =
    user?.email?.endsWith("@demo.carrotchase.com") ?? false;
  if (user && !isDemoUser && !AAL2_EXEMPT.some((p) => path.startsWith(p))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/two-factor";
      return rscAwareRedirect(request, url);
    }
  }

  // Role-scoped path enforcement: a stale prefetched link to another role's
  // dashboard (e.g. lead trying /dashboard/super) is bounced to the user's
  // own dashboard rather than letting the role-mismatched page render and
  // surface as a TypeError when the client router fetches the RSC payload.
  if (user) {
    const wrongRolePath = ROLE_PATHS.find(
      (p) => path.startsWith(p.prefix) && p.allowedFor !== undefined,
    );
    if (wrongRolePath) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role;
      if (role && wrongRolePath.allowedFor !== role) {
        const target = ROLE_HOME[role] ?? "/login";
        const url = request.nextUrl.clone();
        url.pathname = target;
        url.search = "";
        return rscAwareRedirect(request, url);
      }
    }
  }

  return supabaseResponse;
}

const ROLE_PATHS = [
  { prefix: "/dashboard/super", allowedFor: "super_admin" as const },
  { prefix: "/dashboard/school", allowedFor: "school_admin" as const },
  { prefix: "/dashboard/lead", allowedFor: "lead" as const },
];

const ROLE_HOME: Record<string, string> = {
  super_admin: "/dashboard/super",
  school_admin: "/dashboard/school",
  lead: "/dashboard/lead",
};

/**
 * Redirect that works for both regular navigations AND React Server Component
 * payload fetches. RSC requests carry an `RSC: 1` header (or accept
 * `text/x-component`); when redirected with a normal 307, the client tries
 * to parse the HTML login page as an RSC payload and throws TypeError. The
 * `x-middleware-redirect` header tells the Next.js client router to do a
 * full browser navigation instead.
 */
function rscAwareRedirect(request: NextRequest, target: URL) {
  const isRsc =
    request.headers.get("RSC") === "1" ||
    (request.headers.get("Accept") || "").includes("text/x-component");
  if (isRsc) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "x-middleware-redirect": target.toString(),
        "cache-control": "no-store",
      },
    });
  }
  return NextResponse.redirect(target);
}
