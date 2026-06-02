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

/**
 * Build the Content-Security-Policy for a request.
 *
 * Session tokens are readable by JavaScript (the @supabase/ssr browser client
 * reads them via document.cookie), so an XSS would mean account takeover. A
 * strict, nonce-based CSP is therefore real defence-in-depth, not box-ticking:
 *   - script-src is nonce + 'strict-dynamic' (no 'unsafe-inline'), so only
 *     scripts we explicitly trust (Next's nonced bundles + our one nonced
 *     inline theme script) can run.
 *   - frame-ancestors 'none' blocks clickjacking.
 * style-src keeps 'unsafe-inline' because the UI relies heavily on inline
 * style attributes; injected styles are far lower risk than injected scripts.
 */
function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWss = supabaseUrl.replace(/^https/, "wss");
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com`,
    `font-src 'self' https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com`,
    `img-src 'self' data: blob:`,
    `connect-src 'self' ${supabaseUrl} ${supabaseWss}`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function updateSession(request: NextRequest) {
  // Per-request CSP nonce. Only enforced in production — in development the
  // strict policy fights React Fast Refresh / HMR (which inject un-nonced
  // inline scripts and use eval), so we leave CSP off locally.
  const isProd = process.env.NODE_ENV === "production";
  const nonce = isProd ? btoa(crypto.randomUUID()) : "";
  const csp = isProd ? buildCsp(nonce) : "";

  // Forward the nonce + CSP on the *request* headers so Next.js picks up the
  // nonce and stamps it onto its own bootstrap scripts, and so the root
  // layout can read it (via headers()) for our inline theme script.
  const requestHeaders = new Headers(request.headers);
  if (isProd) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
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
  //
  // Demo accounts (@demo.carrotchase.com) can bypass AAL2 so you can walk
  // every role end-to-end without per-user TOTP — but this is GATED so it can
  // NEVER apply in a production build by accident. It only takes effect in
  // non-production, or when ENABLE_DEMO_ACCOUNTS is explicitly set to "true".
  // For a real production deployment, leave that flag unset and every user
  // (demo address or not) must complete 2FA.
  const demoBypassAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEMO_ACCOUNTS === "true";
  const isDemoUser =
    demoBypassAllowed &&
    (user?.email?.endsWith("@demo.carrotchase.com") ?? false);
  if (user && !isDemoUser && !AAL2_EXEMPT.some((p) => path.startsWith(p))) {
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    // Fail CLOSED: if we can't positively confirm an AAL2 session — including
    // when the lookup errors or returns nothing — send the user to /two-factor
    // rather than letting them through. /two-factor is AAL2-exempt, so this
    // cannot loop.
    if (aalError || !aal || aal.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/two-factor";
      return rscAwareRedirect(request, url);
    }
  }

  // Role-scoped path enforcement: a stale prefetched link to another role's
  // dashboard (e.g. lead trying /dashboard/super) is bounced to the user's
  // own dashboard rather than letting the role-mismatched page render and
  // surface as a TypeError when the client router fetches the RSC payload.
  // Only enforce on GET navigations. Server Actions arrive as POST to the
  // same path; they aren't navigations (so the redirect guard is moot) and
  // are already authorised by RLS + the action's own checks. Skipping the
  // profiles role lookup for non-GET requests removes a Supabase round-trip
  // from the critical path of every write action, reducing the latency that
  // pushes cold serverless functions over their timeout.
  if (user && request.method === "GET") {
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

  if (isProd) {
    supabaseResponse.headers.set("content-security-policy", csp);
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
