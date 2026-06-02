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
};

export default nextConfig;
