import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // allowedDevOrigins is dev-only — lets you test on LAN devices (phone,
  // second laptop) without "Blocked cross-origin request" warnings.
  // Has no effect in production.
  allowedDevOrigins: [
    "192.168.1.142",
    "192.168.1.*",
    "10.0.0.*",
    "*.local",
  ],

  // The runner profile used to live under /dashboard/lead/runners/[id],
  // which 500'd for school admins because the proxy bounced them off
  // /dashboard/lead. It now lives at the role-agnostic /dashboard/runners/[id].
  // Keep the old URLs working for cached bookmarks and prefetched RSC links.
  async redirects() {
    return [
      {
        source: "/dashboard/lead/runners/:id",
        destination: "/dashboard/runners/:id",
        permanent: true,
      },
    ];
  },

  // Static security headers applied to every response (the per-request,
  // nonce-based Content-Security-Policy is set in the proxy/middleware).
  // These need no per-request state, so they live here and also cover static
  // assets that the proxy matcher skips.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Force HTTPS for two years, including subdomains. HSTS is ignored
            // over plain http (e.g. localhost), so it's safe to always send.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Belt-and-braces with CSP frame-ancestors 'none'.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
