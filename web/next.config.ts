import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Quiet "Blocked cross-origin request to Next.js dev resource" warnings
  // when loading the app from another device on the same Wi-Fi (phone,
  // second laptop) — Next 16 blocks HMR by default for non-localhost origins.
  // Listing the LAN IP and the *.local hostname keeps the dev experience
  // smooth without weakening the production defaults.
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
