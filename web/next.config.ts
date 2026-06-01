import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is per-user and auth-gated — there is no shared,
  // cacheable content. Setting the client-cache stale times to 0 means a
  // navigation always refetches the page segment, so freshly-written data
  // (e.g. the Super Admin audit log) never shows a stale snapshot from an
  // earlier visit in the same session.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

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
};

export default nextConfig;
