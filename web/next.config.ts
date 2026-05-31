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
};

export default nextConfig;
